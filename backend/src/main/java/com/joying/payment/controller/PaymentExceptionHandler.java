package com.joying.payment.controller;

import com.joying.payment.exception.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * 결제 도메인 예외 처리 핸들러
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.joying.payment")
public class PaymentExceptionHandler {

    /**
     * 결제를 찾을 수 없음
     */
    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentNotFound(PaymentNotFoundException e) {
        log.error("결제 조회 실패: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "PAYMENT_NOT_FOUND");
        response.put("message", e.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * 결제 상태 오류 (잘못된 상태 전이)
     */
    @ExceptionHandler(PaymentStateException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentState(PaymentStateException e) {
        log.error("결제 상태 오류: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "INVALID_PAYMENT_STATE");
        response.put("message", e.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * 중복 결제 시도
     */
    @ExceptionHandler(DuplicatePaymentException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicatePayment(DuplicatePaymentException e) {
        log.error("중복 결제 시도: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "DUPLICATE_PAYMENT");
        response.put("message", e.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * 권한 없음 (다른 사용자의 결제 접근 시도)
     */
    @ExceptionHandler(PaymentAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(PaymentAccessDeniedException e) {
        log.error("결제 접근 권한 없음: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "ACCESS_DENIED");
        response.put("message", "해당 결제에 접근할 권한이 없습니다");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    /**
     * 결제 금액 불일치
     */
    @ExceptionHandler(PaymentAmountMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleAmountMismatch(PaymentAmountMismatchException e) {
        log.error("결제 금액 불일치: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "AMOUNT_MISMATCH");
        response.put("message", e.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * 토스 API 오류
     */
    @ExceptionHandler(TossPaymentException.class)
    public ResponseEntity<Map<String, Object>> handleTossPayment(TossPaymentException e) {
        log.error("토스 API 오류: code={}, message={}", e.getCode(), e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", e.getCode());
        response.put("message", e.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
    }

    /**
     * Validation 오류 (Request DTO 검증 실패)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        log.error("요청 검증 실패: {}", e.getMessage());

        Map<String, Object> response = new HashMap<>();
        response.put("error", "VALIDATION_ERROR");
        response.put("message", "요청 데이터가 유효하지 않습니다");

        Map<String, String> fieldErrors = new HashMap<>();
        e.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        response.put("fields", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * 일반적인 예외 (예상치 못한 오류)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception e) {
        log.error("예상치 못한 오류 발생: {}", e.getMessage(), e);

        Map<String, Object> response = new HashMap<>();
        response.put("error", "INTERNAL_SERVER_ERROR");
        response.put("message", "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
