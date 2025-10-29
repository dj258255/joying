package com.joying.payment.exception;

public class TossPaymentException extends RuntimeException {
    private final String code;
    private final String message;

    public TossPaymentException(String code, String message) {
        super(String.format("[%s] %s", code, message));
        this.code = code;
        this.message = message;
    }

    public TossPaymentException(String message, Throwable cause) {
        super(message, cause);
        this.code = "TOSS_API_ERROR";
        this.message = message;
    }

    public TossPaymentException(String code, String message, Throwable cause) {
        super(String.format("[%s] %s", code, message), cause);
        this.code = code;
        this.message = message;
    }

    public String getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
