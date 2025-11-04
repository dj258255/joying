package com.joying.chat.service

import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.repository.ChatMessageRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import java.time.Instant

/**
 * 채팅 메시지 Service
 *
 * Blocking Repository + Coroutine withContext 패턴 (현업 표준)
 */
@Service
class ChatMessageService(
    private val chatMessageRepository: ChatMessageRepository
) {

    /**
     * 채팅방의 메시지 목록 조회 (페이징)
     *
     * @param chatRoomId 채팅방 ID
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지 크기
     * @return 메시지 목록 (최신순)
     */
    suspend fun getMessages(chatRoomId: Long, page: Int, size: Int): List<ChatMessageDto> =
        withContext(Dispatchers.IO) {
            val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

            chatMessageRepository
                .findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(chatRoomId, pageable)
                .map { ChatMessageDto.from(it) }
        }

    /**
     * 커서 기반 페이징으로 메시지 조회
     * (무한 스크롤용)
     *
     * @param chatRoomId 채팅방 ID
     * @param before 이 시간 이전의 메시지 조회 (null이면 최신부터)
     * @param size 가져올 개수
     * @return 메시지 목록
     */
    suspend fun getMessagesBefore(
        chatRoomId: Long,
        before: Instant?,
        size: Int
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        val pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        val messages = if (before != null) {
            chatMessageRepository.findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
                chatRoomId,
                before,
                pageable
            )
        } else {
            chatMessageRepository.findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
                chatRoomId,
                pageable
            )
        }

        messages.map { ChatMessageDto.from(it) }
    }

    /**
     * 채팅방에서 메시지 검색
     *
     * @param chatRoomId 채팅방 ID
     * @param keyword 검색어
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 검색 결과
     */
    suspend fun searchMessages(
        chatRoomId: Long,
        keyword: String,
        page: Int,
        size: Int
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
                chatRoomId,
                keyword,
                pageable
            )
            .map { ChatMessageDto.from(it) }
    }

    /**
     * 안읽은 메시지 개수 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param lastReadAt 마지막으로 읽은 시간
     * @return 안읽은 메시지 개수
     */
    suspend fun getUnreadCount(chatRoomId: Long, lastReadAt: Instant?): Long =
        withContext(Dispatchers.IO) {
            if (lastReadAt == null) {
                return@withContext 0L
            }

            chatMessageRepository.countByChatRoomIdAndCreatedAtAfter(chatRoomId, lastReadAt)
        }

    /**
     * 특정 시간 이후의 메시지 조회 (재연결 시 놓친 메시지 복구용)
     *
     * WebSocket 연결이 끊겼다가 재연결될 때,
     * 마지막으로 받은 메시지 이후의 모든 메시지를 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param after 이 시간 이후의 메시지 조회
     * @param limit 최대 개수 (기본 100)
     * @return 놓친 메시지 목록 (오래된 순)
     */
    suspend fun getMessagesAfter(
        chatRoomId: Long,
        after: Instant,
        limit: Int = 100
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        val pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "createdAt"))

        chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
                chatRoomId,
                after,
                pageable
            )
            .map { ChatMessageDto.from(it) }
    }

    /**
     * 메시지 삭제 (Soft Delete)
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @param memberId 요청한 회원 ID (권한 확인용)
     */
    suspend fun deleteMessage(chatRoomId: Long, messageId: String, memberId: Long) =
        withContext(Dispatchers.IO) {
            val message = chatMessageRepository.findById(messageId)
                .orElseThrow { IllegalArgumentException("메시지를 찾을 수 없습니다") }

            // 채팅방 확인
            if (message.chatRoomId != chatRoomId) {
                throw IllegalArgumentException("해당 채팅방의 메시지가 아닙니다")
            }

            // 본인 메시지만 삭제 가능
            if (message.senderId != memberId) {
                throw IllegalArgumentException("본인의 메시지만 삭제할 수 있습니다")
            }

            // Soft Delete
            message.delete()
            chatMessageRepository.save(message)
        }

    /**
     * 메시지 수정
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @param newContent 수정할 내용
     * @return 수정된 메시지 DTO
     */
    suspend fun updateMessage(
        chatRoomId: Long,
        messageId: String,
        memberId: Long,
        newContent: String
    ): ChatMessageDto = withContext(Dispatchers.IO) {
        val message = chatMessageRepository.findById(messageId)
            .orElseThrow { IllegalArgumentException("메시지를 찾을 수 없습니다") }

        // 채팅방 확인
        if (message.chatRoomId != chatRoomId) {
            throw IllegalArgumentException("해당 채팅방의 메시지가 아닙니다")
        }

        // 본인 메시지만 수정 가능
        if (message.senderId != memberId) {
            throw IllegalArgumentException("본인의 메시지만 수정할 수 있습니다")
        }

        // 텍스트 메시지만 수정 가능
        if (message.type != com.joying.chat.document.MessageType.TEXT) {
            throw IllegalArgumentException("텍스트 메시지만 수정할 수 있습니다")
        }

        // 삭제된 메시지는 수정 불가
        if (message.isDeleted) {
            throw IllegalArgumentException("삭제된 메시지는 수정할 수 없습니다")
        }

        // 수정 (MongoDB data class는 불변이므로 새 객체 생성)
        val updatedMessage = message.copy(
            content = newContent
        )

        chatMessageRepository.save(updatedMessage)

        ChatMessageDto.from(updatedMessage)
    }
}