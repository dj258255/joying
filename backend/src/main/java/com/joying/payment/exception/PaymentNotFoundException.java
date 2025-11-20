package com.joying.payment.exception;

public class PaymentNotFoundException extends RuntimeException {
    public PaymentNotFoundException(String message) {
        super(message);
    }

    public PaymentNotFoundException(String orderId, String field) {
        super(String.format("Payment not found with %s: %s", field, orderId));
    }
}
