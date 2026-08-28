package com.joying.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.common.response.ApiResponse;
import com.joying.payment.dto.request.PaymentCancelRequest;
import com.joying.payment.dto.request.PaymentConfirmRequest;
import com.joying.payment.dto.request.PaymentCreateRequest;
import com.joying.payment.dto.request.PaymentWebhookRequest;
import com.joying.payment.dto.response.PaymentCreateResponse;
import com.joying.payment.dto.response.PaymentResponse;
import com.joying.payment.exception.InvalidWebhookSignatureException;
import com.joying.payment.service.PaymentTossFlow;
import com.joying.payment.service.PaymentService;
import com.joying.payment.service.PaymentWebhookService;
import com.joying.payment.service.TossWebhookSignatureVerifier;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * 결제 API 컨트롤러
 *
 * API 목록:
 * 1. POST   /payments              - 결제 생성 (orderId 발급)
 * 2. POST   /payments/confirm      - 결제 승인 (Toss 결제 완료 후)
 * 3. GET    /payments/{orderId}    - 결제 상세 조회
 * 4. PATCH  /payments/{orderId}/cancel - 결제 취소
 * 5. GET    /payments/{orderId}/amount - 결제 금액 조회
 * 6. POST   /payments/webhook      - 결제 웹훅 수신 (성공/실패/부정사용)
 */
@Slf4j
@RestController
@RequestMapping("api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentTossFlow paymentTossFlow;
    private final PaymentWebhookService webhookService;
    private final TossWebhookSignatureVerifier signatureVerifier;
    private final ObjectMapper objectMapper;

    /**
     * 1. 결제 생성 (orderId 발급)
     *
     * 프론트엔드에서 결제 위젯을 띄우기 전에 호출
     * - orderId와 금액을 서버에서 생성하여 반환
     * - 이후 토스 결제 위젯에 이 orderId를 전달
     * - 인증된 사용자만 결제 생성 가능 (보안)
     */
    @PostMapping
    public ResponseEntity<ApiResponse.SuccessBody<PaymentCreateResponse>> createPayment(
            @Valid @RequestBody PaymentCreateRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[POST /payments] 결제 생성 요청: rentalHisId={}, memberId={}",
                request.getRentalHisId(), memberId);

        PaymentCreateResponse response = paymentService.createPayment(request, memberId);

        return ApiResponse.created(response);
    }

    /**
     * 2. 결제 승인 (Toss 결제 완료 후)
     *
     * 토스 결제 위젯에서 결제 완료 후 성공 URL로 리다이렉트될 때
     * 프론트엔드가 paymentKey, orderId, amount를 받아 이 API를 호출
     * - 토스 API를 호출하여 최종 승인 처리
     * - DB에 결제 완료 상태 저장
     */
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse.SuccessBody<PaymentResponse>> confirmPayment(
            @Valid @RequestBody PaymentConfirmRequest request) {

        log.info("[POST /payments/confirm] 결제 승인 요청: orderId={}, paymentKey={}",
                request.getOrderId(), request.getPaymentKey());

        PaymentResponse response = paymentTossFlow.confirm(request);

        return ApiResponse.ok(response);
    }

    /**
     * 3. 결제 상세 조회
     *
     * orderId로 결제 정보 조회
     * - 결제 상태, 금액, 영수증 URL 등 반환
     * - 권한 검증: 본인의 결제만 조회 가능
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse.SuccessBody<PaymentResponse>> getPayment(
            @PathVariable String orderId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /payments/{}] 결제 조회 요청: memberId={}", orderId, memberId);

        PaymentResponse response = paymentService.getPayment(orderId, memberId);

        return ApiResponse.ok(response);
    }

    /**
     * 4. 결제 취소
     *
     * 승인된 결제를 취소 (환불)
     * - 토스 API를 호출하여 취소 처리
     * - DB에 취소 상태 저장
     * - 권한 검증: 본인의 결제만 취소 가능
     */
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse.SuccessBody<PaymentResponse>> cancelPayment(
            @PathVariable String orderId,
            @Valid @RequestBody PaymentCancelRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /payments/{}/cancel] 결제 취소 요청: memberId={}, reason={}",
                orderId, memberId, request.getReason());

        PaymentResponse response = paymentTossFlow.cancel(orderId, request, memberId);

        return ApiResponse.ok(response);
    }

    /**
     * 5. 결제 금액 조회
     *
     * orderId로 결제 금액만 조회
     * - 금액 검증 등에 사용
     * - 권한 검증: 본인의 결제만 조회 가능
     */
    @GetMapping("/{orderId}/amount")
    public ResponseEntity<ApiResponse.SuccessBody<Integer>> getPaymentAmount(
            @PathVariable String orderId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /payments/{}/amount] 결제 금액 조회 요청: memberId={}", orderId, memberId);

        Integer amount = paymentService.getPaymentAmount(orderId, memberId);

        return ApiResponse.ok(amount);
    }

    /**
     * 6. 결제 웹훅 수신 (토스 페이먼츠 서버에서 호출)
     *
     * 결제 상태 변경 시 토스 서버가 이 API를 호출
     * - 결제 성공: 자동 승인 처리
     * - 결제 실패: 상태 업데이트
     * - 부정사용 감지: 취소 처리
     *
     * 빠르게 200 OK 응답 후 비동기로 처리 (@Async)
     * 서명 검증으로 가짜 웹훅 차단
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> receiveWebhook(
            @RequestHeader(value = "toss-signature", required = false) String signature,
            @RequestBody String rawBody) {

        log.info("[POST /payments/webhook] 웹훅 수신");

        try {
            // 1. 서명 검증 (가짜 웹훅 차단)
            if (signature == null || !signatureVerifier.verify(signature, rawBody)) {
                log.error("[POST /payments/webhook] 웹훅 서명 검증 실패: signature={}", signature);
                throw new InvalidWebhookSignatureException();
            }

            // 2. JSON 파싱
            PaymentWebhookRequest webhook = objectMapper.readValue(rawBody, PaymentWebhookRequest.class);

            log.info("[POST /payments/webhook] 웹훅 검증 성공: eventType={}, orderId={}",
                    webhook.getEventType(), webhook.getData().getOrderId());

            // 3. 비동기 처리 (빠르게 200 OK 응답)
            webhookService.processWebhook(webhook);

            return ResponseEntity.ok().build();

        } catch (InvalidWebhookSignatureException e) {
            // 서명 검증 실패 - 401 Unauthorized
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            log.error("[POST /payments/webhook] 웹훅 처리 실패: {}", e.getMessage(), e);
            // 토스는 실패 시 재시도하므로 500 반환
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
