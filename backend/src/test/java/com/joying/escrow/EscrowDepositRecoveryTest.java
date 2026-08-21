package com.joying.escrow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.domain.Status;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.escrow.service.EscrowDepositRecoveryService;
import com.joying.payment.domain.Payment;
import com.joying.ssafy.dto.InquireTransactionHistoryResponse.TransactionRec;
import com.joying.ssafy.service.FinanceApiService;

/**
 * 미확정 입금을 다시 물어 확정하는 작업.
 *
 * <p>가장 중요한 규칙은 "확정할 근거가 없으면 확정하지 않는다"이다. 조회가 실패한 것을
 * 거래가 없었던 것으로 읽으면, 실제로 들어간 돈을 장부에서 지우게 된다.
 */
@ExtendWith(MockitoExtension.class)
class EscrowDepositRecoveryTest {

	@Mock
	EscrowRepository escrowRepository;

	@Mock
	FinanceApiService financeApiService;

	@Mock(strictness = Mock.Strictness.LENIENT)
	FinanceApiProperties financeApiProperties;

	@Mock(strictness = Mock.Strictness.LENIENT)
	Payment payment;

	@InjectMocks
	EscrowDepositRecoveryService recoveryService;

	private Escrow unconfirmedEscrow;

	@BeforeEach
	void setUp() {
		FinanceApiProperties.Escrow escrowProps = new FinanceApiProperties.Escrow();
		escrowProps.setAccountNo("0015555555555555");
		escrowProps.setUserKey("escrow-user-key");
		given(financeApiProperties.getEscrow()).willReturn(escrowProps);

		given(payment.getOrderId()).willReturn("ORDER-1");
		unconfirmedEscrow = Escrow.createPending(null, payment, 30_000, 50_000);
	}

	private TransactionRec tx(String txNo, String summary) {
		return TransactionRec.builder()
			.transactionUniqueNo(txNo)
			.transactionSummary(summary)
			.build();
	}

	@Test
	@DisplayName("거래 요약에서 주문번호를 찾으면 입금을 확정한다")
	void confirmsWhenTransactionFound() {
		given(escrowRepository.findByStatus(Status.PENDING)).willReturn(List.of(unconfirmedEscrow));
		given(financeApiService.inquireTransactionHistoryList(anyString(), anyString(), anyString(), anyString()))
			.willReturn(List.of(tx("TX-9", "Toss 결제 에스크로 입금 (orderId: ORDER-1)")));

		recoveryService.confirmUnconfirmedDeposits();

		assertThat(unconfirmedEscrow.getStatus()).isEqualTo(Status.HELD);
		assertThat(unconfirmedEscrow.getDepositTxNo()).isEqualTo("TX-9");
	}

	@Test
	@DisplayName("조회가 실패하면 아무것도 확정하지 않는다. 실패를 거래 없음으로 읽으면 안 된다")
	void confirmsNothingWhenQueryFails() {
		given(escrowRepository.findByStatus(Status.PENDING)).willReturn(List.of(unconfirmedEscrow));
		given(financeApiService.inquireTransactionHistoryList(anyString(), anyString(), anyString(), anyString()))
			.willThrow(new RuntimeException("금융망 조회 실패"));

		recoveryService.confirmUnconfirmedDeposits();

		assertThat(unconfirmedEscrow.getStatus()).isEqualTo(Status.PENDING);
		assertThat(unconfirmedEscrow.getDepositTxNo()).isNull();
	}

	@Test
	@DisplayName("거래를 못 찾아도 실패로 확정하지 않고 미확정으로 남긴다")
	void keepsPendingWhenNotFoundYet() {
		given(escrowRepository.findByStatus(Status.PENDING)).willReturn(List.of(unconfirmedEscrow));
		given(financeApiService.inquireTransactionHistoryList(anyString(), anyString(), anyString(), anyString()))
			.willReturn(List.of(tx("TX-OTHER", "Toss 결제 에스크로 입금 (orderId: ORDER-999)")));

		recoveryService.confirmUnconfirmedDeposits();

		assertThat(unconfirmedEscrow.getStatus()).isEqualTo(Status.PENDING);
	}

	@Test
	@DisplayName("미확정 건이 없으면 금융망을 부르지 않는다")
	void doesNotCallFinanceApiWhenNothingPending() {
		given(escrowRepository.findByStatus(Status.PENDING)).willReturn(List.of());

		recoveryService.confirmUnconfirmedDeposits();

		org.mockito.Mockito.verify(financeApiService, org.mockito.Mockito.never())
			.inquireTransactionHistoryList(any(), any(), any(), any());
	}
}
