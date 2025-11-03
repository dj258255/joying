package com.joying.payment.exception;

public class DuplicatePaymentException extends RuntimeException {
    public DuplicatePaymentException(String orderId) {
        super(String.format("Payment already exists with orderId: %s", orderId));
    }
}
