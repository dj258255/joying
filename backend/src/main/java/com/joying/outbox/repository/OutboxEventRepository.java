package com.joying.outbox.repository;

import com.joying.outbox.domain.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * 미처리 이벤트 조회 (오래된 순으로)
     * - processed = false
     * - retryCount < maxRetries
     * - 오래된 것부터 처리
     *
     * @param limit 조회 개수 제한
     * @return 미처리 이벤트 리스트
     */
    @Query("SELECT e FROM OutboxEvent e " +
           "WHERE e.processed = false " +
           "AND e.retryCount < e.maxRetries " +
           "ORDER BY e.createdAt ASC " +
           "LIMIT :limit")
    List<OutboxEvent> findUnprocessedEvents(@Param("limit") int limit);

    /**
     * 특정 시간 이전에 처리 완료된 이벤트 조회 (정리용)
     *
     * @param before 기준 시각
     * @return 처리 완료된 오래된 이벤트
     */
    @Query("SELECT e FROM OutboxEvent e " +
           "WHERE e.processed = true " +
           "AND e.processedAt < :before")
    List<OutboxEvent> findProcessedEventsBefore(@Param("before") Timestamp before);

    /**
     * 이벤트 타입별 미처리 개수 조회
     *
     * @param eventType 이벤트 타입
     * @return 미처리 개수
     */
    @Query("SELECT COUNT(e) FROM OutboxEvent e " +
           "WHERE e.eventType = :eventType " +
           "AND e.processed = false")
    long countUnprocessedByEventType(@Param("eventType") String eventType);
}
