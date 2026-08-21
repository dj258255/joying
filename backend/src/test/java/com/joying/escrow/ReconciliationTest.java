package com.joying.escrow;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.joying.escrow.service.SettlementReconciliationService.ReconciliationResult;

/**
 * 대사가 무엇을 잡아내야 하는지 고정한다.
 *
 * <p>에러가 나지 않는 사고는 조용히 쌓인다. 결제와 취소와 정산이 각각 도는데 셋을
 * 맞춰 보는 곳이 없으면, 어긋나도 알 방법이 없다.
 */
class ReconciliationTest {

	@Test
	@DisplayName("지갑 잔액과 원장 합계와 미정산 대여료가 모두 같으면 맞은 것이다")
	void balancedWhenAllThreeAgree() {
		ReconciliationResult result = new ReconciliationResult(50_000L, 50_000L, 50_000L);

		assertThat(result.isBalanced()).isTrue();
		assertThat(result.walletMinusLedger()).isZero();
		assertThat(result.walletMinusUnsettled()).isZero();
	}

	@Test
	@DisplayName("지갑 잔액이 원장보다 크면 원장에 안 적힌 돈이 들어온 것이다")
	void detectsMoneyMissingFromLedger() {
		ReconciliationResult result = new ReconciliationResult(60_000L, 50_000L, 60_000L);

		assertThat(result.isBalanced()).isFalse();
		assertThat(result.walletMinusLedger()).isEqualTo(10_000L);
	}

	@Test
	@DisplayName("지갑 잔액이 미정산 대여료보다 크면 나가야 할 돈이 안 나간 것이다")
	void detectsUnsentSettlement() {
		ReconciliationResult result = new ReconciliationResult(80_000L, 80_000L, 50_000L);

		assertThat(result.isBalanced()).isFalse();
		assertThat(result.walletMinusUnsettled()).isEqualTo(30_000L);
	}

	@Test
	@DisplayName("지갑 잔액이 미정산 대여료보다 작으면 없는 돈을 보낸 것이다")
	void detectsOverpayment() {
		ReconciliationResult result = new ReconciliationResult(20_000L, 20_000L, 50_000L);

		assertThat(result.isBalanced()).isFalse();
		assertThat(result.walletMinusUnsettled()).isEqualTo(-30_000L);
	}

	@Test
	@DisplayName("보증금은 이 식에 나타나지 않는다. 나타나면 다시 우리 장부로 들어온 것이다")
	void depositDoesNotAppearInTheEquation() {
		// 대여료 50,000원만 적립된 상태. 보증금 300,000원은 결제에 남아 있다.
		ReconciliationResult result = new ReconciliationResult(50_000L, 50_000L, 50_000L);
		assertThat(result.isBalanced()).isTrue();

		// 보증금이 지갑으로 들어오면 지갑만 커져 바로 드러난다.
		ReconciliationResult withDeposit = new ReconciliationResult(350_000L, 350_000L, 50_000L);
		assertThat(withDeposit.isBalanced()).isFalse();
		assertThat(withDeposit.walletMinusUnsettled()).isEqualTo(300_000L);
	}
}
