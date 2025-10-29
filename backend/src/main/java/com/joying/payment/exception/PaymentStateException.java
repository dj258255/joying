package com.joying.payment.exception;

import com.joying.payment.domain.PaymentStatus;

public class PaymentStateException extends RuntimeException {
    public PaymentStateException(String message) {
        super(message);
    }

    public PaymentStateException(PaymentStatus current, PaymentStatus required) {
        super(String.format("Invalid payment state. Current: %s, Required: %s", current, required));
    }
}
