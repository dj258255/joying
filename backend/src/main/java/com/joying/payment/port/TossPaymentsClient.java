package com.joying.payment.port;

import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;

public interface TossPaymentsClient {
    TossConfirmResponse confirm(String paymentKey, String orderId, int amount);
    TossCancelResponse cancel(String paymentKey, String reason);

    /**
     * 결제의 일부만 취소한다.
     *
     * <p>보증금처럼 나중에 얼마를 돌려줄지 정해지는 금액을 다룰 때 쓴다.
     *
     * @param cancelAmount   되돌릴 금액
     * @param idempotencyKey 같은 취소를 두 번 보내도 한 번만 처리되게 하는 열쇠.
     *                       재시도는 같은 값을, 서로 다른 부분취소는 다른 값을 쓴다
     */
    TossCancelResponse cancelPartial(String paymentKey, String reason, long cancelAmount,
                                     String idempotencyKey);

    /**
     * orderId로 결제 조회 (멱등성 처리용)
     * @param orderId 주문 ID
     * @return 결제 정보
     */
    TossConfirmResponse getPaymentByOrderId(String orderId);

    /**
     * paymentKey로 결제를 조회한다.
     *
     * <p>취소가 실제로 반영됐는지 확인할 때 쓴다. 응답의 남은 금액이 되돌린 만큼
     * 줄어 있으면 반영된 것이다.
     */
    TossConfirmResponse getPaymentByPaymentKey(String paymentKey);
}
