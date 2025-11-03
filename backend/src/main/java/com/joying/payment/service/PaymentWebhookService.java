package com.joying.payment.service;

import com.joying.escrow.domain.Escrow;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentMethod;
import com.joying.payment.domain.PaymentStatus;
import com.joying.payment.dto.request.PaymentWebhookRequest;
import com.joying.payment.exception.PaymentNotFoundException;
import com.joying.payment.repository.PaymentRepository;
import com.joying.rental.domain.RentalHistory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;

/**
 * 결제 웹훅 처리 서비스
 * - 비동기 처리 (@Async)
 * - 멱등성 보장 (중복 웹훅 수신 대비)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWebhookService {

    private final PaymentRepository paymentRepository;
    private final EscrowRepository escrowRepository;

    /**
     * 웹훅 이벤트 처리 (비동기)
     * - 성공: 결제 승인 처리
     * - 실패: 상태 업데이트
     * - 부정사용: 취소 처리
     */
    @Async("paymentWebhookExecutor")
    @Transactional
    public void processWebhook(PaymentWebhookRequest webhook) {
        log.info("[Webhook] 웹훅 수신: eventType={}, orderId={}, status={}",
                webhook.getEventType(), webhook.getData().getOrderId(), webhook.getData().getStatus());

        try {
            String orderId = webhook.getData().getOrderId();
            String status = webhook.getData().getStatus();

            // Payment 조회
            Payment payment = paymentRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

            // 멱등성 체크 (이미 처리된 경우 스킵)
            if (isAlreadyProcessed(payment, status)) {
                log.warn("[Webhook] 이미 처리된 웹훅: orderId={}, currentStatus={}", orderId, payment.getStatus());
                return;
            }

            // 상태별 처리
            switch (status) {
                case "DONE":
                    handleSuccess(payment, webhook.getData());
                    break;
                case "CANCELED":
                case "ABORTED":
                    handleFailure(payment, status);
                    break;
                default:
                    log.warn("[Webhook] 알 수 없는 상태: status={}", status);
            }

            log.info("[Webhook] 웹훅 처리 완료: orderId={}, status={}", orderId, status);

        } catch (Exception e) {
            log.error("[Webhook] 웹훅 처리 실패: eventType={}, error={}",
                    webhook.getEventType(), e.getMessage(), e);
            // TODO: 실패 알림 전송 (Slack, Email 등)
        }
    }

    /**
     * 결제 성공 처리
     */
    private void handleSuccess(Payment payment, PaymentWebhookRequest.WebhookData data) {
        if (payment.getStatus() == PaymentStatus.DONE) {
            return; // 이미 처리됨
        }

        // Payment 상태 업데이트
        payment.approve(
                data.getPaymentKey(),
                PaymentMethod.valueOf(data.getMethod()),
                Timestamp.valueOf(data.getApprovedAt()),
                data.getReceiptUrl()
        );

        // RentalHistory 상태 업데이트 (ESCROW)
        RentalHistory rentalHistory = payment.getRentalHistory();
        rentalHistory.markAsEscrow();

        // Escrow 생성 (보증금 예치) - 중복 생성 방지
        if (escrowRepository.findByPayment_PaymentId(payment.getPaymentId()).isEmpty()) {
            Integer rentalFee = rentalHistory.getFee();
            Integer depositAmount = rentalHistory.getDeposit().intValue();

            Escrow escrow = Escrow.createHeld(rentalHistory, payment, rentalFee, depositAmount);
            escrowRepository.save(escrow);
            log.info("[Webhook] Escrow 생성 완료: escrowId={}, paymentId={}", escrow.getHoldId(), payment.getPaymentId());
        }

        log.info("[Webhook] 결제 승인 처리 완료: paymentId={}", payment.getPaymentId());
    }

    /**
     * 결제 실패/취소 처리
     */
    private void handleFailure(Payment payment, String status) {
        if (payment.getStatus() == PaymentStatus.CANCELED || payment.getStatus() == PaymentStatus.FAILED) {
            return; // 이미 처리됨
        }

        // Payment 취소
        payment.cancel();

        // RentalHistory 취소
        RentalHistory rentalHistory = payment.getRentalHistory();
        rentalHistory.cancel();

        // Escrow 취소 (이미 생성되었다면)
        escrowRepository.findByPayment_PaymentId(payment.getPaymentId())
                .ifPresent(escrow -> {
                    escrow.cancel();
                    log.info("[Webhook] Escrow 취소: escrowId={}", escrow.getHoldId());
                });

        log.info("[Webhook] 결제 취소 처리 완료: paymentId={}, status={}", payment.getPaymentId(), status);
    }

    /**
     * 멱등성 체크
     */
    private boolean isAlreadyProcessed(Payment payment, String webhookStatus) {
        PaymentStatus currentStatus = payment.getStatus();

        // DONE 웹훅인데 이미 DONE 상태
        if ("DONE".equals(webhookStatus) && currentStatus == PaymentStatus.DONE) {
            return true;
        }

        // CANCELED/ABORTED 웹훅인데 이미 CANCELED 상태
        if (("CANCELED".equals(webhookStatus) || "ABORTED".equals(webhookStatus))
                && currentStatus == PaymentStatus.CANCELED) {
            return true;
        }

        return false;
    }
}
