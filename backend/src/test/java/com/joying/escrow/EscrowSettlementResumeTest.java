package com.joying.escrow;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.joying.escrow.domain.Escrow;

/**
 * 정산 송금이 중간에 멈춘 뒤 다시 돌 때 이미 나간 돈을 또 보내지 않는지 확인한다.
 *
 * <p>대여료 지급이 성공한 뒤 보증금 반환이 실패하면 예전에는 예외를 던져 트랜잭션을
 * 되돌렸다. 롤백은 DB만 되돌리고 이미 나간 대여료는 되돌리지 못하므로, 정산을 다시
 * 돌리면 대여료가 한 번 더 나갔다. 거래고유번호를 남겨 그 단계를 건너뛰게 한 것이
 * 이 테스트가 지키는 규칙이다.
 */
class EscrowSettlementResumeTest {

	private Escrow newEscrow() {
		return Escrow.createPending(null, null, 30_000, 50_000);
	}

	@Test
	@DisplayName("입금 확정 전에는 PENDING이고, 확정되면 거래고유번호가 남고 HELD가 된다")
	void depositConfirmationMovesToHeld() {
		Escrow escrow = newEscrow();

		assertThat(escrow.isDepositUnconfirmed()).isTrue();

		escrow.markHeld("TX-DEPOSIT");

		assertThat(escrow.isDepositUnconfirmed()).isFalse();
		assertThat(escrow.getDepositTxNo()).isEqualTo("TX-DEPOSIT");
	}

	@Test
	@DisplayName("대여료가 나가기 전에는 보낼 대상이고, 확정되면 다시 보내지 않는다")
	void rentalFeeIsSentOnlyOnce() {
		Escrow escrow = newEscrow();

		assertThat(escrow.isRentalFeeSent()).isFalse();

		escrow.markRentalFeeSent("TX-FEE", Timestamp.from(Instant.now()));

		assertThat(escrow.isRentalFeeSent()).isTrue();
		assertThat(escrow.getRentalFeeTxNo()).isEqualTo("TX-FEE");
		assertThat(escrow.getRentalFeeReleasedAt()).isNotNull();
	}

	@Test
	@DisplayName("대여료만 나가고 보증금에서 멈춰도 대여료 기록은 남는다")
	void partialSettlementKeepsWhatAlreadyWentOut() {
		Escrow escrow = newEscrow();
		escrow.markHeld("TX-DEPOSIT");

		// 1단계는 확정, 2단계는 거절돼 멈춘 상태
		escrow.markRentalFeeSent("TX-FEE", Timestamp.from(Instant.now()));

		assertThat(escrow.isRentalFeeSent()).isTrue();
		assertThat(escrow.isDepositReturned()).isFalse();

		// 다시 돌리면 대여료는 건너뛰고 보증금부터 이어간다
		escrow.markDepositReturned("TX-RETURN", Timestamp.from(Instant.now()));

		assertThat(escrow.getRentalFeeTxNo()).isEqualTo("TX-FEE");
		assertThat(escrow.getDepositReturnTxNo()).isEqualTo("TX-RETURN");
	}

	@Test
	@DisplayName("입금이 확정되지 않은 에스크로는 예치로 넘어갈 수 없다")
	void cannotHoldTwice() {
		Escrow escrow = newEscrow();
		escrow.markHeld("TX-DEPOSIT");

		try {
			escrow.markHeld("TX-DEPOSIT-AGAIN");
			assertThat(false).as("두 번 예치로 넘어가면 안 된다").isTrue();
		} catch (IllegalStateException expected) {
			assertThat(escrow.getDepositTxNo()).isEqualTo("TX-DEPOSIT");
		}
	}
}
