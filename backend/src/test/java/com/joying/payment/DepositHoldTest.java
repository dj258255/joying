package com.joying.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import com.joying.payment.adapter.deposit.FullCaptureDepositHoldAdapter;
import com.joying.payment.exception.TossPaymentException;
import com.joying.payment.port.TossPaymentsClient;
import com.joying.wallet.port.TransferOutcome;

/**
 * 보증금을 카드에서 되돌리는 경로.
 *
 * <p>보증금은 플랫폼 장부를 지나지 않는다. 받는 사람의 계좌를 몰라도 되고, 우리가 그
 * 돈을 들고 있지도 않는다. 대신 되돌리는 요청이 정확해야 한다. 금액을 잘못 넣으면
 * 대여료까지 같이 돌아가고, 두 번 보내면 두 번 돌아간다.
 */
@ExtendWith(MockitoExtension.class)
class DepositHoldTest {

	private static final String PAYMENT_KEY = "payment-key-1";

	@Mock
	TossPaymentsClient tossClient;

	@InjectMocks
	FullCaptureDepositHoldAdapter adapter;

	@Test
	@DisplayName("정상 반납이면 보증금 전액을 되돌린다")
	void releasesWholeDeposit() {
		adapter.release(PAYMENT_KEY, 300_000L, "deposit-release-1", "정상 반납");

		ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
		verify(tossClient).cancelPartial(anyString(), anyString(), amount.capture(), anyString());
		assertThat(amount.getValue()).isEqualTo(300_000L);
	}

	@Test
	@DisplayName("파손이면 배상액을 뺀 나머지만 되돌린다")
	void refundsOnlyTheRemainderWhenClaimed() {
		adapter.claim(PAYMENT_KEY, 300_000L, 80_000L, "deposit-claim-1", "파손 배상");

		ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
		verify(tossClient).cancelPartial(anyString(), anyString(), amount.capture(), anyString());
		assertThat(amount.getValue())
			.as("배상액은 남기고 나머지만 돌아간다")
			.isEqualTo(220_000L);
	}

	@Test
	@DisplayName("보증금 전액이 배상으로 확정되면 카드를 건드리지 않는다")
	void doesNotCallCardWhenNothingToRefund() {
		TransferOutcome outcome = adapter.claim(PAYMENT_KEY, 300_000L, 300_000L,
			"deposit-claim-2", "전손");

		assertThat(outcome).isInstanceOf(TransferOutcome.Succeeded.class);
		verify(tossClient, never()).cancelPartial(anyString(), anyString(), anyLong(), anyString());
	}

	@Test
	@DisplayName("배상액이 보증금을 넘으면 거절한다. 대여료까지 되돌리면 안 된다")
	void rejectsClaimBeyondDeposit() {
		TransferOutcome outcome = adapter.claim(PAYMENT_KEY, 300_000L, 300_001L,
			"deposit-claim-3", "과다 청구");

		assertThat(outcome).isInstanceOf(TransferOutcome.Rejected.class);
		assertThat(((TransferOutcome.Rejected) outcome).reasonCode()).isEqualTo("INVALID_CLAIM_AMOUNT");
		verify(tossClient, never()).cancelPartial(anyString(), anyString(), anyLong(), anyString());
	}

	@Test
	@DisplayName("같은 처리에는 같은 열쇠를 보낸다. 재시도가 두 번 되돌리지 않게 하는 건 이 열쇠다")
	void sendsReferenceAsIdempotencyKey() {
		adapter.release(PAYMENT_KEY, 300_000L, "deposit-release-42", "정상 반납");

		ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
		verify(tossClient).cancelPartial(anyString(), anyString(), anyLong(), key.capture());
		assertThat(key.getValue()).isEqualTo("deposit-release-42");
	}

	@Test
	@DisplayName("카드사가 거절하면 확정 실패다. 돈은 그대로다")
	void rejectedWhenCardCompanyRefuses() {
		given(tossClient.cancelPartial(anyString(), anyString(), anyLong(), anyString()))
			.willThrow(new TossPaymentException("EXCEED_CANCEL_AMOUNT", "취소 가능 금액을 초과했습니다"));

		TransferOutcome outcome = adapter.release(PAYMENT_KEY, 300_000L, "deposit-release-2", "정상 반납");

		assertThat(outcome).isInstanceOf(TransferOutcome.Rejected.class);
		assertThat(((TransferOutcome.Rejected) outcome).reasonCode()).isEqualTo("EXCEED_CANCEL_AMOUNT");
	}

	@Test
	@DisplayName("응답을 못 받으면 미확정이다. 되돌렸는지 알 수 없으니 다시 보내면 안 된다")
	void unconfirmedWhenNoResponse() {
		given(tossClient.cancelPartial(anyString(), anyString(), anyLong(), anyString()))
			.willThrow(new RuntimeException("Read timed out"));

		TransferOutcome outcome = adapter.release(PAYMENT_KEY, 300_000L, "deposit-release-3", "정상 반납");

		assertThat(outcome).isInstanceOf(TransferOutcome.Unconfirmed.class);
	}
}
