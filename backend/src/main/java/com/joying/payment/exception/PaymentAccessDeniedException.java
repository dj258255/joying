package com.joying.payment.exception;

public class PaymentAccessDeniedException extends RuntimeException {
    public PaymentAccessDeniedException(String orderId, Long requestedBy, Long ownerId) {
        super(String.format("접근 권한이 없습니다. orderId=%s, 요청자=%d, 소유자=%d",
            orderId, requestedBy, ownerId));
    }
}
