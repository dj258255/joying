package com.joying.outbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.outbox.domain.OutboxEvent;
import com.joying.outbox.repository.OutboxEventRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.repository.PaymentRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;

/**
 * Outbox 이벤트 폴링 및 처리 서비스
 * - 1초마다 미처리 이벤트 조회
 * - 이벤트 타입별로 처리
 * - 실패 시 자동 재시도 (최대 3회)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxEventProcessor {

    private final OutboxEventRepository outboxEventRepository;
    private final EscrowRepository escrowRepository;
    private final PaymentRepository paymentRepository;
    private final RentalHistoryRepository rentalHistoryRepository;
    private final ObjectMapper objectMapper;

    /**
     * 스케줄링: 1초마다 미처리 이벤트 폴링
     * - fixedDelay: 이전 작업 완료 후 1초 대기
     * - 동시 실행 방지
     */
    @Scheduled(fixedDelay = 1000)
    public void pollAndProcess() {
        try {
            // 미처리 이벤트 조회 (최대 100개)
            List<OutboxEvent> events = outboxEventRepository.findUnprocessedEvents(100);

            if (events.isEmpty()) {
                return; // 처리할 이벤트 없음
            }

            log.info("[Outbox Processor] 미처리 이벤트 {}개 발견", events.size());

            // 각 이벤트를 별도 트랜잭션으로 처리
            for (OutboxEvent event : events) {
                processEvent(event);
            }

        } catch (Exception e) {
            log.error("[Outbox Processor] 폴링 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 이벤트 처리 (별도 트랜잭션)
     * - 각 이벤트는 독립적으로 처리
     * - 하나 실패해도 다른 이벤트에 영향 없음
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processEvent(OutboxEvent event) {
        try {
            log.info("[Outbox] 이벤트 처리 시작: eventId={}, eventType={}, retryCount={}",
                    event.getEventId(), event.getEventType(), event.getRetryCount());

            // 이벤트 타입별 처리
            switch (event.getEventType()) {
                case "ESCROW_CREATE":
                    handleEscrowCreate(event);
                    break;
                case "ESCROW_SETTLE":
                    handleEscrowSettle(event);
                    break;
                default:
                    log.warn("[Outbox] 알 수 없는 이벤트 타입: {}", event.getEventType());
                    event.markAsProcessed(); // 처리 불가능한 이벤트는 스킵
            }

            // 처리 완료 마킹
            event.markAsProcessed();
            outboxEventRepository.save(event);

            log.info("[Outbox] 이벤트 처리 완료: eventId={}", event.getEventId());

        } catch (Exception e) {
            log.error("[Outbox] 이벤트 처리 실패: eventId={}, error={}",
                    event.getEventId(), e.getMessage(), e);

            // 실패 기록 (재시도 카운트 증가)
            event.recordFailure(e.getMessage());
            outboxEventRepository.save(event);

            if (!event.canRetry()) {
                log.error("[Outbox] 최대 재시도 초과, 처리 중단: eventId={}", event.getEventId());
                // TODO: 알림 전송 (Slack, Email 등)
            }
        }
    }

    /**
     * ESCROW_CREATE 이벤트 처리
     * - Payment 승인 후 Escrow 생성
     */
    private void handleEscrowCreate(OutboxEvent event) throws Exception {
        JsonNode payload = objectMapper.readTree(event.getPayload());

        Long rentalHisId = payload.get("rentalHisId").asLong();
        Long paymentId = payload.get("paymentId").asLong();

        // RentalHistory 조회
        RentalHistory rentalHistory = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("대여 내역을 찾을 수 없습니다: " + rentalHisId));

        // Payment 조회
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("결제 정보를 찾을 수 없습니다: " + paymentId));

        // 중복 생성 방지
        if (escrowRepository.findByPayment_PaymentId(paymentId).isPresent()) {
            log.warn("[Outbox] Escrow 이미 존재: paymentId={}", paymentId);
            return;
        }

        // Escrow 생성
        Integer rentalFee = rentalHistory.getFee();
        Integer depositAmount = rentalHistory.getDeposit().intValue();

        Escrow escrow = Escrow.createHeld(rentalHistory, payment, rentalFee, depositAmount);
        escrowRepository.save(escrow);

        log.info("[Outbox] Escrow 생성 완료: escrowId={}, paymentId={}", escrow.getHoldId(), paymentId);
    }

    /**
     * ESCROW_SETTLE 이벤트 처리
     * - 정산 시 SSAFY 금융 API 호출
     * - TODO: 실제 송금 로직 구현
     */
    private void handleEscrowSettle(OutboxEvent event) throws Exception {
        JsonNode payload = objectMapper.readTree(event.getPayload());

        Long holdId = payload.get("holdId").asLong();
        Integer depositOwnerAmt = payload.get("depositOwnerAmt").asInt();
        Integer depositRenterAmt = payload.get("depositRenterAmt").asInt();
        Integer rentalFee = payload.get("rentalFee").asInt();

        // Escrow 조회
        Escrow escrow = escrowRepository.findById(holdId)
                .orElseThrow(() -> new IllegalArgumentException("에스크로를 찾을 수 없습니다: " + holdId));

        // TODO: SSAFY 금융 API 호출
        // 1. 대여료 → 대여자 계좌로 송금
        // 2. 보증금 → 빌린이 계좌로 송금
        // ssafyFinanceClient.transfer(ownerId, rentalFee);
        // ssafyFinanceClient.transfer(renterId, depositRenterAmt);

        // 정산 완료 마킹
        escrow.settle();
        escrowRepository.save(escrow);

        log.info("[Outbox] Escrow 정산 완료: holdId={}", holdId);
    }

    /**
     * 오래된 처리 완료 이벤트 정리 (매일 자정)
     * - 7일 이상 지난 처리 완료 이벤트 삭제
     */
    @Scheduled(cron = "0 0 0 * * *")  // 매일 자정
    @Transactional
    public void cleanupOldEvents() {
        try {
            // 7일 전
            Timestamp sevenDaysAgo = new Timestamp(System.currentTimeMillis() - 7L * 24 * 60 * 60 * 1000);

            List<OutboxEvent> oldEvents = outboxEventRepository.findProcessedEventsBefore(sevenDaysAgo);

            if (!oldEvents.isEmpty()) {
                outboxEventRepository.deleteAll(oldEvents);
                log.info("[Outbox Cleanup] 오래된 이벤트 {}개 삭제", oldEvents.size());
            }

        } catch (Exception e) {
            log.error("[Outbox Cleanup] 정리 실패: {}", e.getMessage(), e);
        }
    }
}
