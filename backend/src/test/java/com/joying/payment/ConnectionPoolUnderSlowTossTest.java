package com.joying.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import com.joying.TestcontainersConfiguration;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentType;
import com.joying.payment.dto.request.PaymentConfirmRequest;
import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.exception.TossPaymentException;
import com.joying.payment.port.TossPaymentsClient;
import com.joying.payment.repository.PaymentRepository;
import com.joying.payment.service.PaymentTossFlow;
import com.joying.product.domain.RentMethod;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;

/**
 * 토스가 느릴 때 결제와 상관없는 조회가 얼마나 기다리는지 잰다.
 *
 * <p>상황 24에서 잰 것은 "토스를 부르는 동안 커넥션을 쥐고 있는가" 하나였다. 쥐고
 * 있으면 풀이 빈다는 것은 따라 나오는 결과지만, 실제로 몇 초를 기다리는지는 재지
 * 않았다. 여기서 그것을 잰다.
 *
 * <p>커넥션 5개에 승인 5건을 동시에 밀어 넣고, 그 다섯이 모두 토스 자리에 들어간
 * 뒤에 <b>결제와 아무 상관 없는 조회</b> 하나를 던져 얼마나 기다리는지 본다. 운영에서
 * 이 자리는 채팅 목록이나 상품 조회다.
 *
 * <p>옛 모양을 대조군으로 함께 돌린다. 지우고 나면 비교할 것이 없어 새 모양의 숫자가
 * 좋은 것인지 알 수 없다.
 *
 * <p>운영값은 커넥션 30개에 응답 제한 10초다. 여기서는 5개에 2초로 줄였다. 비율을
 * 맞춘 것이 아니라 <b>풀이 확실히 비는 조건</b>을 만든 것이다. 절대 시간이 아니라
 * 기다리느냐 아니냐를 본다.
 */
@SpringBootTest
@ActiveProfiles({"local", "test"})
@Import({TestcontainersConfiguration.class, ConnectionPoolUnderSlowTossTest.SlowToss.class})
class ConnectionPoolUnderSlowTossTest {

	/** 커넥션 수와 동시 요청 수를 같게 둔다. 옛 모양이면 풀이 정확히 빈다 */
	private static final int POOL_SIZE = 5;
	private static final int CONCURRENT_CONFIRMS = 5;

	/** 토스가 이만큼 걸린다고 본다 */
	private static final long TOSS_MILLIS = 2_000;

	@DynamicPropertySource
	static void properties(DynamicPropertyRegistry registry) {
		registry.add("spring.data.redis.host",
			() -> TestcontainersConfiguration.getRedisContainer().getHost());
		registry.add("spring.data.redis.port",
			() -> TestcontainersConfiguration.getRedisContainer().getMappedPort(6379));
		registry.add("spring.datasource.hikari.maximum-pool-size", () -> POOL_SIZE);
		// 기다리다 죽지 않고 끝까지 기다리게 둔다. 얼마나 기다렸는지가 재려는 값이다
		registry.add("spring.datasource.hikari.connection-timeout", () -> 20_000);
	}

	@Autowired PaymentTossFlow paymentTossFlow;
	@Autowired PaymentRepository paymentRepository;
	@Autowired MemberRepository memberRepository;
	@Autowired RentalHistoryRepository rentalHistoryRepository;
	@Autowired SlowTossProbe toss;
	@Autowired OldShape oldShape;

	private final List<String> orderIds = new ArrayList<>();

	@BeforeEach
	void setUp() {
		orderIds.clear();

		Member member = memberRepository.save(Member.builder()
			.nickname("재는사람")
			.email(UUID.randomUUID() + "@joying.test")
			.build());

		// 서로 다른 행을 잠가야 한다. 같은 행이면 행 잠금에서 줄을 서느라
		// 커넥션이 비는지 아닌지를 볼 수 없다.
		for (int i = 0; i < CONCURRENT_CONFIRMS; i++) {
			Timestamp start = Timestamp.from(Instant.now());
			Timestamp end = Timestamp.from(Instant.now().plusSeconds(86_400));
			RentalHistory rental = rentalHistoryRepository.save(
				RentalHistory.create(null, member, start, end, RentMethod.ONLY_ONLINE, 10_000, 50_000L));

			String orderId = "JOYING_POOL_" + UUID.randomUUID();
			Payment payment = Payment.create(rental, null, member, PaymentType.INITIAL);
			payment.markReady(orderId, 70_000, Timestamp.from(Instant.now()));
			paymentRepository.save(payment);
			orderIds.add(orderId);
		}
	}

	@Test
	@DisplayName("옛 모양은 상관없는 조회를 토스 왕복만큼 기다리게 한다")
	void theOldShapeMakesUnrelatedQueriesWait() throws Exception {
		long waited = waitOfAnUnrelatedQuery(orderIds.stream()
			.map(orderId -> (Runnable) () -> oldShape.lockThenAskToss(orderId))
			.toList());

		System.out.printf("[옛 모양] 상관없는 조회가 기다린 시간: %dms%n", waited);
		assertThat(waited)
			.as("커넥션이 다 나가 있어 토스가 끝날 때까지 기다린다")
			.isGreaterThan(TOSS_MILLIS / 2);
	}

	@Test
	@DisplayName("새 모양은 상관없는 조회를 기다리게 하지 않는다")
	void theNewShapeLetsUnrelatedQueriesThrough() throws Exception {
		long waited = waitOfAnUnrelatedQuery(orderIds.stream()
			.map(orderId -> (Runnable) () -> confirmIgnoringTheProbeException(orderId))
			.toList());

		System.out.printf("[새 모양] 상관없는 조회가 기다린 시간: %dms%n", waited);
		assertThat(waited)
			.as("토스를 기다리는 동안 커넥션을 놓았으므로 바로 받는다")
			.isLessThan(TOSS_MILLIS / 4);
	}

	/**
	 * 동시 요청이 모두 토스 자리에 들어간 뒤, 결제와 상관없는 조회 하나가 커넥션을
	 * 받기까지 걸린 시간을 잰다.
	 */
	private long waitOfAnUnrelatedQuery(List<Runnable> concurrent) throws Exception {
		toss.expect(concurrent.size(), TOSS_MILLIS);

		ExecutorService threads = Executors.newFixedThreadPool(concurrent.size());
		List<Future<?>> running = concurrent.stream().map(threads::submit).toList();

		// 다섯이 전부 토스 자리에 들어가야 재는 의미가 있다. 하나라도 덜 들어갔으면
		// 풀이 비지 않은 상태에서 재게 된다
		toss.awaitAllEntered();

		long startedAt = System.nanoTime();
		paymentRepository.count();
		long waitedMillis = (System.nanoTime() - startedAt) / 1_000_000;

		for (Future<?> f : running) {
			try {
				f.get(30, TimeUnit.SECONDS);
			} catch (Exception expected) {
				// 대역이 마지막에 예외를 던진다. 재는 값과 무관하다
			}
		}
		threads.shutdown();
		return waitedMillis;
	}

	private void confirmIgnoringTheProbeException(String orderId) {
		try {
			paymentTossFlow.confirm(PaymentConfirmRequest.builder()
				.orderId(orderId)
				.paymentKey("test-payment-key")
				.amount(70_000)
				.build());
		} catch (TossPaymentException expected) {
			// 대역이 끝에서 던진다
		}
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class SlowToss {

		@Bean
		@Primary
		SlowTossProbe slowTossProbe() {
			return new SlowTossProbe();
		}

		@Bean
		OldShape oldShape(SlowTossProbe probe, PaymentRepository payments) {
			return new OldShape(probe, payments);
		}
	}

	/**
	 * 느린 토스 대역.
	 *
	 * <p>불리면 "들어왔다"고 알리고 정해진 시간만큼 머문다. 재는 쪽은 전부 들어온 것을
	 * 보고 나서 잰다.
	 */
	static class SlowTossProbe implements TossPaymentsClient {

		private volatile CountDownLatch entered = new CountDownLatch(0);
		private volatile long sleepMillis;

		void expect(int calls, long sleepMillis) {
			this.entered = new CountDownLatch(calls);
			this.sleepMillis = sleepMillis;
		}

		void awaitAllEntered() throws InterruptedException {
			if (!entered.await(30, TimeUnit.SECONDS)) {
				throw new IllegalStateException("토스 자리에 다 들어오지 않았다. 재기 전에 흐름이 끊겼다");
			}
		}

		/** 토스에 머무는 동안을 흉내 낸다 */
		void stayAwhile() {
			entered.countDown();
			try {
				Thread.sleep(sleepMillis);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}

		private RuntimeException stopHere() {
			return new TossPaymentException("PROBE", "재고 여기서 세운다");
		}

		@Override
		public TossConfirmResponse confirm(String paymentKey, String orderId, int amount) {
			stayAwhile();
			throw stopHere();
		}

		@Override
		public TossCancelResponse cancel(String paymentKey, String reason) {
			stayAwhile();
			throw stopHere();
		}

		@Override
		public TossCancelResponse cancelPartial(String paymentKey, String reason, long cancelAmount,
												String idempotencyKey) {
			stayAwhile();
			throw stopHere();
		}

		@Override
		public TossConfirmResponse getPaymentByOrderId(String orderId) {
			stayAwhile();
			throw stopHere();
		}

		@Override
		public TossConfirmResponse getPaymentByPaymentKey(String paymentKey) {
			stayAwhile();
			throw stopHere();
		}
	}

	/**
	 * 고치기 전의 모양. 한 트랜잭션 안에서 행을 잠그고, 그 잠금을 쥔 채로 토스에 머문다.
	 */
	static class OldShape {

		private final SlowTossProbe probe;
		private final PaymentRepository payments;

		OldShape(SlowTossProbe probe, PaymentRepository payments) {
			this.probe = probe;
			this.payments = payments;
		}

		@Transactional
		public void lockThenAskToss(String orderId) {
			payments.lockByOrderId(orderId).orElseThrow();
			probe.stayAwhile();
		}
	}
}
