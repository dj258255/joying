package com.joying.outbox.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.outbox.domain.OutboxEvent;
import com.joying.outbox.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Outbox 이벤트 발행 서비스
 * - 도메인 이벤트를 Outbox 테이블에 저장
 * - 호출한 곳의 트랜잭션에 참여 (REQUIRED)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * 이벤트 발행 (Outbox 테이블에 저장)
     * - 호출한 곳의 트랜잭션에 참여
     * - Payment 승인과 같은 트랜잭션으로 커밋됨
     *
     * @param eventType 이벤트 타입 (예: "ESCROW_CREATE")
     * @param aggregateId 집계 루트 ID (예: rentalHisId)
     * @param payload 페이로드 객체 (자동 JSON 변환)
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void publish(String eventType, Long aggregateId, Object payload) {
        try {
            // 페이로드를 JSON으로 변환
            String jsonPayload = objectMapper.writeValueAsString(payload);

            // Outbox 이벤트 생성
            OutboxEvent event = OutboxEvent.create(eventType, aggregateId, jsonPayload);

            // Outbox 테이블에 저장 (같은 트랜잭션)
            outboxEventRepository.save(event);

            log.info("[Outbox] 이벤트 발행: eventType={}, aggregateId={}, eventId={}",
                    eventType, aggregateId, event.getEventId());

        } catch (Exception e) {
            log.error("[Outbox] 이벤트 발행 실패: eventType={}, aggregateId={}, error={}",
                    eventType, aggregateId, e.getMessage(), e);
            throw new RuntimeException("이벤트 발행 실패", e);
        }
    }

    /**
     * 이벤트 발행 (JSON 문자열 직접 전달)
     *
     * @param eventType 이벤트 타입
     * @param aggregateId 집계 루트 ID
     * @param jsonPayload JSON 페이로드
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void publishJson(String eventType, Long aggregateId, String jsonPayload) {
        OutboxEvent event = OutboxEvent.create(eventType, aggregateId, jsonPayload);
        outboxEventRepository.save(event);

        log.info("[Outbox] 이벤트 발행 (JSON): eventType={}, aggregateId={}, eventId={}",
                eventType, aggregateId, event.getEventId());
    }
}
