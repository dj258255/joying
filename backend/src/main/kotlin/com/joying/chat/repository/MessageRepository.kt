package com.joying.chat.repository

import com.joying.chat.domain.Message
import com.joying.chat.domain.MessageType
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Slice
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.data.mongodb.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

/**
 * 메시지 Repository (MongoDB)
 *
 * 대용량 메시지 처리를 위해 MongoDB 사용
 */
@Repository
interface MessageRepository : MongoRepository<Message, String> {

    /**
     * 채팅방 ID로 메시지 목록 조회 (페이징 - Slice 사용)
     *
     * Slice: 다음 페이지 존재 여부만 확인 (count 쿼리 없음 → 성능 최적화)
     * Pageable.ofSize(20).withSort(Sort.by("createdAt").descending())
     */
    fun findByChatRoomId(chatRoomId: Long, pageable: Pageable): Slice<Message>

    /**
     * 채팅방 ID와 생성일시 범위로 메시지 조회 (커서 기반 페이징용)
     */
    fun findByChatRoomIdAndCreatedAtBefore(
        chatRoomId: Long,
        createdAt: Instant,
        pageable: Pageable
    ): Slice<Message>

    /**
     * 채팅방 ID로 최신 메시지 1개 조회
     */
    fun findFirstByChatRoomIdOrderByCreatedAtDesc(chatRoomId: Long): Message?

    /**
     * 채팅방 ID와 메시지 타입으로 메시지 수 조회
     */
    fun countByChatRoomIdAndMessageType(chatRoomId: Long, messageType: MessageType): Long

    /**
     * 채팅방 ID와 생성일시 이후의 메시지 수 조회 (읽지 않은 메시지 수 계산용)
     */
    @Query("{ 'chatRoomId': ?0, 'createdAt': { \$gt: ?1 } }")
    fun countByChatRoomIdAndCreatedAtAfter(chatRoomId: Long, createdAt: Instant): Long

    /**
     * 특정 메시지 ID 이후의 메시지 수 조회 (읽지 않은 메시지 수 계산용)
     */
    @Query("{ 'chatRoomId': ?0, '_id': { \$gt: { \$oid: ?1 } } }")
    fun countByChatRoomIdAndIdAfter(chatRoomId: Long, messageId: String): Long

    /**
     * 채팅방 ID로 모든 메시지 삭제 (채팅방 삭제 시)
     */
    fun deleteByChatRoomId(chatRoomId: Long): Long
}