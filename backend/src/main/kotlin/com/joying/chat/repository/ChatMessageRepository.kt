package com.joying.chat.repository

import com.joying.chat.document.ChatMessage
import kotlinx.coroutines.flow.Flow
import org.springframework.data.domain.Pageable
import org.springframework.data.mongodb.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

/**
 * 채팅 메시지 Repository (MongoDB + Coroutine)
 *
 * 비동기 처리를 위해 CoroutineCrudRepository 사용
 * - suspend 함수: 단일 결과
 * - Flow: 다중 결과 (스트림)
 */
@Repository
interface ChatMessageRepository : CoroutineCrudRepository<ChatMessage, String> {

    /**
     * 채팅방 ID로 메시지 목록 조회 (페이징)
     * Flow: 비동기 스트림 (여러 결과를 순차적으로 방출)
     */
    fun findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
        chatRoomId: Long,
        pageable: Pageable
    ): Flow<ChatMessage>

    /**
     * 채팅방 ID와 생성 시간 이전 메시지 조회 (커서 기반 페이징)
     */
    fun findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
        chatRoomId: Long,
        before: LocalDateTime,
        pageable: Pageable
    ): Flow<ChatMessage>

    /**
     * 채팅방 ID로 최신 메시지 1개 조회
     * suspend: 단일 결과를 비동기로 반환
     */
    suspend fun findFirstByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
        chatRoomId: Long
    ): ChatMessage?

    /**
     * 채팅방 ID와 생성 시간 이후 메시지 개수 조회 (안읽은 메시지 개수)
     */
    @Query("{ 'chatRoomId': ?0, 'isDeleted': false, 'createdAt': { \$gt: ?1 } }")
    suspend fun countByChatRoomIdAndCreatedAtAfter(
        chatRoomId: Long,
        after: LocalDateTime
    ): Long

    /**
     * 채팅방 ID로 메시지 검색
     */
    fun findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
        chatRoomId: Long,
        keyword: String,
        pageable: Pageable
    ): Flow<ChatMessage>

    /**
     * 채팅방 ID로 모든 메시지 삭제 (채팅방 삭제 시)
     */
    suspend fun deleteByChatRoomId(chatRoomId: Long): Long
}