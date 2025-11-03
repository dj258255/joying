package com.joying.payment.exception;

public class InvalidWebhookSignatureException extends RuntimeException {
    public InvalidWebhookSignatureException() {
        super("웹훅 서명이 유효하지 않습니다. 신뢰할 수 없는 요청입니다.");
    }
}
