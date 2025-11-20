package com.joying.payment.exception;

public class PaymentAmountMismatchException extends RuntimeException {
    public PaymentAmountMismatchException(int expected, int actual) {
        super(String.format("Payment amount mismatch. Expected: %d, Actual: %d", expected, actual));
    }
}
