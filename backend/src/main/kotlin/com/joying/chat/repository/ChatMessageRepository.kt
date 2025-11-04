package com.joying.chat.repository

import com.joying.chat.document.ChatMessage
import org.springframework.data.domain.Pageable
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.data.mongodb.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

/**
 * 채팅 메시지 Repository (MongoDB Blocking)
 *
 * 현업 표준 패턴: 단순하고 안정적인 blocking I/O
 * - Coroutine은 Service 레이어에서 withContext(Dispatchers.IO) 사용
 */
@Repository
interface ChatMessageRepository : MongoRepository<ChatMessage, String> {

    /**
     * 채팅방 ID로 메시지 목록 조회 (페이징)
     */
    fun findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
        chatRoomId: Long,
        pageable: Pageable
    ): List<ChatMessage>

    /**
     * 채팅방 ID와 생성 시간 이전 메시지 조회 (커서 기반 페이징)
     */
    fun findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
        chatRoomId: Long,
        before: Instant,
        pageable: Pageable
    ): List<ChatMessage>

    /**
     * 채팅방 ID로 최신 메시지 1개 조회
     */
    fun findFirstByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
        chatRoomId: Long
    ): ChatMessage?

    /**
     * 채팅방 ID와 생성 시간 이후 메시지 개수 조회 (안읽은 메시지 개수)
     */
    @Query("{ 'chatRoomId': ?0, 'isDeleted': false, 'createdAt': { \$gt: ?1 } }")
    fun countByChatRoomIdAndCreatedAtAfter(
        chatRoomId: Long,
        after: Instant
    ): Long

    /**
     * 채팅방 ID로 메시지 검색
     */
    fun findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
        chatRoomId: Long,
        keyword: String,
        pageable: Pageable
    ): List<ChatMessage>

    /**
     * 특정 시간 이후 메시지 조회 (재연결 시 놓친 메시지 조회용)
     * 오래된 순으로 정렬 (ASC) - 클라이언트에서 순서대로 받기 위함
     */
    fun findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
        chatRoomId: Long,
        after: Instant,
        pageable: Pageable
    ): List<ChatMessage>

    /**
     * 채팅방 ID로 모든 메시지 삭제 (채팅방 삭제 시)
     */
    fun deleteByChatRoomId(chatRoomId: Long): Long
}