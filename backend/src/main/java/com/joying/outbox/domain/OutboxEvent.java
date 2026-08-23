package com.joying.outbox.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;

/**
 * Outbox 패턴용 이벤트 테이블
 * - 트랜잭션 일관성 보장
 * - 비동기 이벤트 처리
 * - 재시도 메커니즘
 */
@Getter
@Entity
@Table(
    name = "outbox_event",
    indexes = {
        @Index(name = "idx_outbox_processed_created", columnList = "processed, created_at"),
        @Index(name = "idx_outbox_event_type", columnList = "event_type")
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "eventId", callSuper = false)
public class OutboxEvent {

    @Id
    @Column(name = "event_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;

    @Comment("이벤트 타입 (ESCROW_CREATE, PAYMENT_APPROVED 등)")
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Comment("집계 루트 ID (rentalHisId, paymentId 등)")
    @Column(name = "aggregate_id", nullable = false)
    private Long aggregateId;

    @Comment("이벤트 페이로드 (JSON)")
    @Lob
    @Column(name = "payload", nullable = false, columnDefinition = "text")
    private String payload;

    @Comment("처리 완료 여부")
    @Column(name = "processed", nullable = false)
    private Boolean processed;

    @Comment("재시도 횟수")
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Comment("최대 재시도 횟수")
    @Column(name = "max_retries", nullable = false)
    private Integer maxRetries;

    @Comment("마지막 오류 메시지")
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Comment("이벤트 생성 시각")
    @Column(name = "created_at", nullable = false)
    private Timestamp createdAt;

    @Comment("처리 완료 시각")
    @Column(name = "processed_at")
    private Timestamp processedAt;

    /**
     * Outbox 이벤트 생성
     *
     * @param eventType 이벤트 타입
     * @param aggregateId 집계 루트 ID
     * @param payload JSON 페이로드
     * @return OutboxEvent 엔티티
     */
    public static OutboxEvent create(String eventType, Long aggregateId, String payload) {
        OutboxEvent event = new OutboxEvent();
        event.eventType = eventType;
        event.aggregateId = aggregateId;
        event.payload = payload;
        event.processed = false;
        event.retryCount = 0;
        event.maxRetries = 3;  // 최대 3번 재시도
        event.createdAt = new Timestamp(System.currentTimeMillis());
        return event;
    }

    /**
     * 처리 완료 마킹
     */
    public void markAsProcessed() {
        this.processed = true;
        this.processedAt = new Timestamp(System.currentTimeMillis());
    }

    /**
     * 처리 실패 기록 (재시도용)
     *
     * @param errorMessage 오류 메시지
     */
    public void recordFailure(String errorMessage) {
        this.retryCount++;
        this.errorMessage = errorMessage;

        // 최대 재시도 초과 시 처리 완료로 마킹 (더 이상 재시도 안 함)
        if (this.retryCount >= this.maxRetries) {
            this.processed = true;
            this.processedAt = new Timestamp(System.currentTimeMillis());
        }
    }

    /**
     * 재시도 가능 여부
     */
    public boolean canRetry() {
        return !processed && retryCount < maxRetries;
    }
}
