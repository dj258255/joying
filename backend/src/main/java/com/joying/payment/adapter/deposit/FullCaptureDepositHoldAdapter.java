package com.joying.payment.adapter.deposit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.joying.payment.exception.TossPaymentException;
import com.joying.payment.port.DepositHoldPort;
import com.joying.payment.port.TossPaymentsClient;
import com.joying.wallet.port.TransferOutcome;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 보증금까지 결제 시점에 매입된 상태에서 다루는 구현.
 *
 * <p>보증금을 승인만 하고 매입을 미루는 것(수동매입)은 PG와 계약할 때 정하는 설정이라
 * 코드로 켤 수 없다. 그래서 지금은 결제 전액이 매입된 채로 시작하고, 보증금을 푸는 것이
 * 부분취소가 된다.
 *
 * <p>수동매입을 쓸 수 있게 되면 이 자리에 다른 구현을 넣는다. 부르는 쪽은 그대로다.
 * 달라지는 것은 고객에게 보이는 모습뿐이다. 매입을 미루면 한도만 잡혔다 풀리고,
 * 지금은 청구됐다가 돌아온다.
 *
 * <p>플랫폼 장부를 지나지 않는다는 점은 두 구현이 같다. 보증금은 어느 쪽에서도
 * 우리 원장에 적히지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FullCaptureDepositHoldAdapter implements DepositHoldPort {

	private final TossPaymentsClient tossClient;

	/**
	 * 승인일로부터 매입을 요청할 수 있는 기간이 30일이다. 반납과 확인에 쓸 여유를 빼고
	 * 대여 기간 상한으로 삼는다. 이 값을 늘리려면 PG 약관을 다시 봐야 한다.
	 */
	@Value("${joying.rental.max-period-days:21}")
	private int maxRentalPeriodDays;

	@Override
	public TransferOutcome release(String paymentKey, long depositAmount,
								   String reference, String reason) {
		return cancel(paymentKey, depositAmount, reference, reason, "보증금 반환");
	}

	@Override
	public TransferOutcome claim(String paymentKey, long depositAmount, long claimAmount,
								 String reference, String reason) {
		if (claimAmount < 0 || claimAmount > depositAmount) {
			return new TransferOutcome.Rejected("INVALID_CLAIM_AMOUNT",
				"배상액이 보증금 범위를 벗어난다: claim=" + claimAmount + ", deposit=" + depositAmount);
		}

		long refundAmount = depositAmount - claimAmount;
		if (refundAmount == 0) {
			// 보증금 전액이 배상으로 확정됐다. 되돌릴 것이 없다.
			log.info("[보증금] 전액 배상으로 확정: paymentKey={}, amount={}", paymentKey, claimAmount);
			return new TransferOutcome.Succeeded("no-refund:" + reference);
		}
		return cancel(paymentKey, refundAmount, reference, reason, "보증금 일부 반환");
	}

	private TransferOutcome cancel(String paymentKey, long amount,
								   String reference, String reason, String what) {
		if (amount <= 0) {
			return new TransferOutcome.Rejected("INVALID_AMOUNT", "되돌릴 금액이 0 이하다: " + amount);
		}

		try {
			var response = tossClient.cancelPartial(paymentKey, reason, amount, reference);
			log.info("[보증금] {} 요청함: paymentKey={}, amount={}, reference={}",
				what, paymentKey, amount, reference);

			// 부분취소는 매입 뒤에 도는 절차라 요청한 자리에서 끝나지 않는다. 카드사에
			// 반영되기까지 영업일이 걸리므로, 여기서 돌려주는 성공은 "요청이 받아들여졌다"는
			// 뜻이지 "고객 카드에 반영됐다"는 뜻이 아니다. 반영 확인은 따로 해야 한다.
			return new TransferOutcome.Succeeded(
				response == null ? reference : String.valueOf(response.getStatus()));

		} catch (TossPaymentException e) {
			// 카드사가 요청을 받고 거절했다. 돈은 그대로다.
			log.error("[보증금] {} 거절: paymentKey={}, code={}, message={}",
				what, paymentKey, e.getCode(), e.getMessage());
			return new TransferOutcome.Rejected(e.getCode(), e.getMessage());

		} catch (Exception e) {
			// 응답을 못 받았다. 취소가 걸렸는지 알 수 없으므로 다시 보내면 안 되고,
			// 같은 열쇠로 다시 물어 확인해야 한다.
			log.error("[보증금] {} 결과 미확정: paymentKey={}, reference={}",
				what, paymentKey, reference, e);
			return new TransferOutcome.Unconfirmed(
				e.getClass().getSimpleName() + ": " + e.getMessage());
		}
	}

	@Override
	public String name() {
		return "full-capture";
	}

	@Override
	public int holdLimitDays() {
		return maxRentalPeriodDays;
	}
}
