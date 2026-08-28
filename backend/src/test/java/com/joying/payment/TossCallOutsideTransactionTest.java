package com.joying.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import javax.sql.DataSource;

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
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.joying.TestcontainersConfiguration;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentMethod;
import com.joying.payment.domain.PaymentType;
import com.joying.payment.dto.request.PaymentCancelRequest;
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
import com.zaxxer.hikari.HikariDataSource;

/**
 * 토스를 부르는 동안 DB 커넥션을 잡고 있지 않은지 잰다.
 *
 * <p>예전에는 승인과 취소가 통째로 한 트랜잭션이었다. 행을 잠그고, 토스에 묻고, 답을
 * 반영하는 셋이 같은 경계 안에 있었다. 그래서 토스에 묻는 내내 행 잠금과 커넥션을
 * 함께 붙잡았다. 연결 제한 5초에 응답 제한 10초이므로 한 번에 최대 15초다. 커넥션은
 * 앱 전체가 30개를 나눠 쓴다. 토스가 느려지면 결제와 상관없는 요청까지 막힌다.
 *
 * <p>여기서 재는 것은 "토스를 부르는 그 순간에 트랜잭션이 열려 있고 커넥션이 나가
 * 있는가" 하나다. 동시에 여러 건을 밀어 넣어 풀이 비는 것을 재지 않는 이유는, 그것이
 * 이 성질에서 따라 나오는 결과일 뿐이고 재는 데 시간과 흔들림이 붙기 때문이다.
 * 원인 쪽을 고정한다.
 *
 * <p>토스 자리는 대역으로 바꾼다. 붙을 실 API 키가 없어 부를 수 없다. 바꾼 것은 밖에
 * 있는 상대뿐이고, 트랜잭션 경계와 프록시는 실제 코드 그대로 지난다.
 */
@SpringBootTest
@ActiveProfiles({"local", "test"})
@Import({TestcontainersConfiguration.class, TossCallOutsideTransactionTest.StubbedToss.class})
class TossCallOutsideTransactionTest {

	@DynamicPropertySource
	static void redisProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.data.redis.host",
			() -> TestcontainersConfiguration.getRedisContainer().getHost());
		registry.add("spring.data.redis.port",
			() -> TestcontainersConfiguration.getRedisContainer().getMappedPort(6379));
	}

	@Autowired PaymentTossFlow paymentTossFlow;
	@Autowired PaymentRepository paymentRepository;
	@Autowired MemberRepository memberRepository;
	@Autowired RentalHistoryRepository rentalHistoryRepository;
	@Autowired TossProbe toss;
	@Autowired InsideTransaction insideTransaction;

	private String orderId;
	private Long memberId;

	@BeforeEach
	void setUp() {
		toss.forget();
		orderId = "JOYING_TEST_" + UUID.randomUUID();

		Member member = memberRepository.save(Member.builder()
			.nickname("재는사람")
			.email(UUID.randomUUID() + "@joying.test")
			.build());
		memberId = member.getMemberId();

		Timestamp start = Timestamp.from(Instant.now());
		Timestamp end = Timestamp.from(Instant.now().plusSeconds(86_400));
		RentalHistory rental = rentalHistoryRepository.save(
			RentalHistory.create(null, member, start, end, RentMethod.ONLY_ONLINE, 10_000, 50_000L));

		Payment payment = Payment.create(rental, null, member, PaymentType.INITIAL);
		payment.markReady(orderId, 70_000, Timestamp.from(Instant.now()));
		paymentRepository.save(payment);
	}

	@Test
	@DisplayName("옛 모양으로 부르면 잠금과 커넥션을 쥔 채로 토스에 간다")
	void theOldShapeHoldsTheConnection() {
		// 옛 승인이 하던 그대로다. 한 트랜잭션 안에서 행을 잠그고 그 상태로 토스를
		// 부른다. 여기서 재는 값이 고치기 전의 값이다.
		//
		// 이 대조가 없으면 아래 두 테스트가 통과해도 그것이 고쳐졌기 때문인지
		// 재는 자리가 틀려서 아무것도 못 보고 있기 때문인지 알 수 없다.
		insideTransaction.lockThenObserve(orderId);

		TossProbe.Observation observed = toss.lastObservation();
		assertThat(observed.insideTransaction())
			.as("트랜잭션 안이다")
			.isTrue();
		assertThat(observed.activeConnections())
			.as("잠근 채로 나가 있는 커넥션")
			.isGreaterThanOrEqualTo(1);
	}

	@Test
	@DisplayName("승인은 트랜잭션 밖에서 토스를 부른다")
	void confirmCallsTossOutsideTransaction() {
		PaymentConfirmRequest request = PaymentConfirmRequest.builder()
			.orderId(orderId)
			.paymentKey("test-payment-key")
			.amount(70_000)
			.build();

		assertThatThrownBy(() -> paymentTossFlow.confirm(request))
			.isInstanceOf(TossPaymentException.class);

		TossProbe.Observation observed = toss.lastObservation();
		assertThat(observed.insideTransaction())
			.as("토스를 부르는 동안 트랜잭션이 열려 있으면 안 된다")
			.isFalse();
		assertThat(observed.activeConnections())
			.as("토스를 부르는 동안 나가 있는 커넥션이 없어야 한다")
			.isZero();
	}

	@Test
	@DisplayName("취소도 트랜잭션 밖에서 토스를 부른다")
	void cancelCallsTossOutsideTransaction() {
		approveThePayment();

		PaymentCancelRequest request = PaymentCancelRequest.builder()
			.paymentId(orderId)
			.reason("재는 중")
			.build();

		assertThatThrownBy(() -> paymentTossFlow.cancel(orderId, request, memberId))
			.isInstanceOf(TossPaymentException.class);

		TossProbe.Observation observed = toss.lastObservation();
		assertThat(observed.insideTransaction()).isFalse();
		assertThat(observed.activeConnections()).isZero();
	}

	/** 취소는 승인된 결제에만 걸린다 */
	private void approveThePayment() {
		Payment payment = paymentRepository.findByOrderId(orderId).orElseThrow();
		payment.approve("test-payment-key", PaymentMethod.CARD,
			Timestamp.from(Instant.now()), "https://receipt.test");
		paymentRepository.save(payment);
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class StubbedToss {

		/**
		 * 실 구현({@code TossPaymentsClientImpl})은 local 프로필이라 컨텍스트에 함께
		 * 뜬다. 지우지 않고 이쪽을 우선으로 둔다.
		 */
		@Bean
		@Primary
		TossProbe tossProbe(DataSource dataSource) {
			return new TossProbe(dataSource);
		}

		@Bean
		InsideTransaction insideTransaction(TossProbe probe, PaymentRepository payments) {
			return new InsideTransaction(probe, payments);
		}
	}

	/**
	 * 토스 자리에 놓는 대역. 불린 그 순간에 트랜잭션과 커넥션이 어떤 상태인지 적어 둔다.
	 *
	 * <p>적은 뒤에는 예외를 던져 흐름을 세운다. 그 뒤를 이어 가려면 승인 결과를 반영할
	 * 데이터가 더 필요한데, 여기서 재려는 것은 부르기 직전까지의 성질이다.
	 * 재시도에 걸리지 않는 예외를 고른다.
	 */
	static class TossProbe implements TossPaymentsClient {

		record Observation(boolean insideTransaction, int activeConnections) {
		}

		private final DataSource dataSource;
		private volatile Observation last;

		TossProbe(DataSource dataSource) {
			this.dataSource = dataSource;
		}

		void forget() {
			this.last = null;
		}

		Observation lastObservation() {
			if (last == null) {
				throw new IllegalStateException("토스 자리가 불리지 않았다. 재기 전에 흐름이 끊겼다");
			}
			return last;
		}

		/** 부르는 쪽이 트랜잭션 안인지, 커넥션이 몇 개 나가 있는지 적는다 */
		void observe() {
			this.last = new Observation(
				TransactionSynchronizationManager.isActualTransactionActive(),
				activeConnections());
		}

		private int activeConnections() {
			if (dataSource instanceof HikariDataSource hikari) {
				return hikari.getHikariPoolMXBean().getActiveConnections();
			}
			throw new IllegalStateException(
				"HikariCP 가 아니라 커넥션을 셀 수 없다: " + dataSource.getClass());
		}

		private RuntimeException stopHere() {
			return new TossPaymentException("PROBE", "재고 여기서 세운다");
		}

		@Override
		public TossConfirmResponse confirm(String paymentKey, String orderId, int amount) {
			observe();
			throw stopHere();
		}

		@Override
		public TossCancelResponse cancel(String paymentKey, String reason) {
			observe();
			throw stopHere();
		}

		@Override
		public TossCancelResponse cancelPartial(String paymentKey, String reason, long cancelAmount,
												String idempotencyKey) {
			observe();
			throw stopHere();
		}

		@Override
		public TossConfirmResponse getPaymentByOrderId(String orderId) {
			observe();
			throw stopHere();
		}

		@Override
		public TossConfirmResponse getPaymentByPaymentKey(String paymentKey) {
			observe();
			throw stopHere();
		}
	}

	/**
	 * 고치기 전의 모양을 그대로 둔 대조군.
	 *
	 * <p>옛 {@code confirmPayment}가 하던 순서다. 한 트랜잭션 안에서 행을 잠그고, 그
	 * 잠금을 쥔 채로 토스를 부른다. 여기서 나오는 값이 고치기 전의 값이다.
	 *
	 * <p>잠그는 것이 중요하다. 잠그지 않고 재면 하이버네이트가 아직 커넥션을 가져오지
	 * 않아, 트랜잭션 안인데도 0으로 보인다.
	 */
	static class InsideTransaction {

		private final TossProbe probe;
		private final PaymentRepository payments;

		InsideTransaction(TossProbe probe, PaymentRepository payments) {
			this.probe = probe;
			this.payments = payments;
		}

		@Transactional
		public void lockThenObserve(String orderId) {
			payments.lockByOrderId(orderId).orElseThrow();
			probe.observe();
		}
	}
}
