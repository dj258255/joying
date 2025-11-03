package com.joying.payment.port;

import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;

public interface TossPaymentsClient {
    TossConfirmResponse confirm(String paymentKey, String orderId, int amount);
    TossCancelResponse cancel(String paymentKey, String reason);
}
