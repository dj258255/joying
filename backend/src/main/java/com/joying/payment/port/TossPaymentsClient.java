package com.joying.payment.port;

import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;

public interface TossPaymentsClient {
    TossConfirmResponse confirm(String paymentKey, String orderId, int amount);
    TossCancelResponse cancel(String paymentKey, String reason);

    /**
     * orderId로 결제 조회 (멱등성 처리용)
     * @param orderId 주문 ID
     * @return 결제 정보
     */
    TossConfirmResponse getPaymentByOrderId(String orderId);
}
