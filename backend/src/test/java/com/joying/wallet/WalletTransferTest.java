package com.joying.wallet;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;

import com.joying.wallet.port.TransferOutcome;
import com.joying.wallet.domain.Wallet;
import com.joying.wallet.repository.WalletEntryRepository;
import com.joying.wallet.repository.WalletRepository;
import com.joying.wallet.repository.WalletTransferRepository;
import com.joying.wallet.service.WalletService;

/**
 * 지갑 사이 이체.
 *
 * <p>돈이 걸린 자리라 인메모리 DB로 재지 않는다. 잔액을 조건부 UPDATE로 빼는 것과
 * 참조에 걸린 유니크 제약이 실제로 경합을 막아 주는지는 쓰는 DB에 달려 있다.
 */
@DataJpaTest
@Import(WalletService.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class WalletTransferTest {

	@SuppressWarnings("resource")
	static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
		.withDatabaseName("joying_test");

	static {
		POSTGRES.start();
	}

	@DynamicPropertySource
	static void datasource(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
		registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
	}

	@Autowired
	WalletService walletService;

	@Autowired
	WalletRepository walletRepository;

	@Autowired
	WalletTransferRepository transferRepository;

	@Autowired
	WalletEntryRepository entryRepository;

	private Long escrowWalletId;
	private Long memberWalletId;

	@BeforeEach
	void setUp() {
		// 테스트마다 잔액을 0에서 시작한다. 트랜잭션 롤백에 기대지 않는 이유는
		// 동시성 테스트가 진짜 스레드와 진짜 커밋으로 돌아야 하기 때문이다.
		entryRepository.deleteAllInBatch();
		transferRepository.deleteAllInBatch();
		walletRepository.deleteAllInBatch();

		escrowWalletId = walletService.getOrCreateEscrowWallet().getWalletId();
		memberWalletId = walletService.getOrCreateMemberWallet(1L).getWalletId();
	}

	private long balanceOf(Long walletId) {
		return walletRepository.findById(walletId).orElseThrow().getBalance();
	}

	@Test
	@DisplayName("밖에서 들어온 돈이 에스크로 지갑에 적립된다")
	void creditFromOutside() {
		long before = balanceOf(escrowWalletId);

		TransferOutcome outcome = walletService.transfer(
			null, escrowWalletId, 10_000L, "ref-credit-1", "결제 적립");

		assertThat(outcome).isInstanceOf(TransferOutcome.Succeeded.class);
		assertThat(balanceOf(escrowWalletId)).isEqualTo(before + 10_000L);
	}

	@Test
	@DisplayName("같은 참조로 두 번 불러도 돈은 한 번만 움직인다")
	void sameReferenceMovesMoneyOnce() {
		long before = balanceOf(escrowWalletId);

		TransferOutcome first = walletService.transfer(
			null, escrowWalletId, 7_000L, "ref-once", "결제 적립");
		TransferOutcome second = walletService.transfer(
			null, escrowWalletId, 7_000L, "ref-once", "결제 적립");

		assertThat(first).isInstanceOf(TransferOutcome.Succeeded.class);
		assertThat(second).isInstanceOf(TransferOutcome.Succeeded.class);
		assertThat(second.transferIdOrNull())
			.as("두 번째는 첫 번째 이체를 그대로 가리킨다")
			.isEqualTo(first.transferIdOrNull());
		assertThat(balanceOf(escrowWalletId)).isEqualTo(before + 7_000L);
	}

	@Test
	@DisplayName("잔액보다 큰 이체는 거절되고 잔액이 그대로다")
	void rejectsWhenBalanceIsNotEnough() {
		walletService.transfer(null, escrowWalletId, 5_000L, "ref-seed-1", "적립");
		long before = balanceOf(escrowWalletId);

		TransferOutcome outcome = walletService.transfer(
			escrowWalletId, memberWalletId, before + 1L, "ref-too-much", "정산");

		assertThat(outcome).isInstanceOf(TransferOutcome.Rejected.class);
		assertThat(((TransferOutcome.Rejected) outcome).reasonCode())
			.isEqualTo("INSUFFICIENT_BALANCE");
		assertThat(balanceOf(escrowWalletId)).isEqualTo(before);
		assertThat(balanceOf(memberWalletId)).isZero();
	}

	@Test
	@DisplayName("거절된 이체는 기록도 남기지 않아 같은 참조로 다시 시도할 수 있다")
	void rejectedTransferCanBeRetriedWithSameReference() {
		TransferOutcome rejected = walletService.transfer(
			escrowWalletId, memberWalletId, 3_000L, "ref-retry", "정산");
		assertThat(rejected).isInstanceOf(TransferOutcome.Rejected.class);

		walletService.transfer(null, escrowWalletId, 3_000L, "ref-seed-2", "적립");

		TransferOutcome retried = walletService.transfer(
			escrowWalletId, memberWalletId, 3_000L, "ref-retry", "정산");

		assertThat(retried).isInstanceOf(TransferOutcome.Succeeded.class);
		assertThat(balanceOf(memberWalletId)).isEqualTo(3_000L);
	}

	@Test
	@DisplayName("잔액 20,000원에 5,000원 이체 10건이 동시에 들어와도 4건만 나가고 잔액은 음수가 되지 않는다")
	void concurrentTransfersNeverGoBelowZero() throws Exception {
		walletService.transfer(null, escrowWalletId, 20_000L, "ref-seed-3", "적립");

		int attempts = 10;
		long amount = 5_000L;
		ExecutorService pool = Executors.newFixedThreadPool(attempts);
		List<Callable<TransferOutcome>> tasks = IntStream.range(0, attempts)
			.<Callable<TransferOutcome>>mapToObj(i -> () -> walletService.transfer(
				escrowWalletId, memberWalletId, amount, "ref-concurrent-" + i, "정산"))
			.toList();

		List<Future<TransferOutcome>> futures = pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);

		long succeeded = 0;
		for (Future<TransferOutcome> f : futures) {
			if (f.get() instanceof TransferOutcome.Succeeded) {
				succeeded++;
			}
		}

		assertThat(succeeded).as("20,000원으로는 5,000원 이체를 넷까지만 할 수 있다").isEqualTo(4);
		assertThat(balanceOf(escrowWalletId)).isZero();
		assertThat(balanceOf(memberWalletId)).isEqualTo(20_000L);
	}

	@Test
	@DisplayName("같은 참조로 동시에 들어와도 한 번만 나간다")
	void concurrentSameReferenceMovesMoneyOnce() throws Exception {
		walletService.transfer(null, escrowWalletId, 20_000L, "ref-seed-4", "적립");

		int attempts = 8;
		ExecutorService pool = Executors.newFixedThreadPool(attempts);
		List<Callable<TransferOutcome>> tasks = IntStream.range(0, attempts)
			.<Callable<TransferOutcome>>mapToObj(i -> () -> walletService.transfer(
				escrowWalletId, memberWalletId, 5_000L, "ref-same", "정산"))
			.toList();

		pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);

		assertThat(balanceOf(memberWalletId))
			.as("같은 참조라 돈은 한 번만 움직인다")
			.isEqualTo(5_000L);
		assertThat(balanceOf(escrowWalletId)).isEqualTo(15_000L);
	}

	@Test
	@DisplayName("원장을 더한 값이 지갑 잔액과 같다")
	void ledgerAgreesWithBalance() {
		walletService.transfer(null, escrowWalletId, 30_000L, "ref-led-1", "적립");
		walletService.transfer(escrowWalletId, memberWalletId, 12_000L, "ref-led-2", "정산");
		walletService.transfer(escrowWalletId, memberWalletId, 3_000L, "ref-led-3", "정산");

		assertThat(walletService.balanceFromLedger(escrowWalletId))
			.isEqualTo(balanceOf(escrowWalletId));
		assertThat(walletService.balanceFromLedger(memberWalletId))
			.isEqualTo(balanceOf(memberWalletId));
		assertThat(balanceOf(memberWalletId)).isEqualTo(15_000L);
	}
}
