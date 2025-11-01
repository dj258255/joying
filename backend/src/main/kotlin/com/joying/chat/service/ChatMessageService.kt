package com.joying.chat.service

import com.joying.chat.document.ChatMessage
import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.repository.ChatMessageRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.toList
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import java.time.LocalDateTime

/**
 * 채팅 메시지 Service
 *
 * 메시지 조회, 검색 기능 (코루틴)
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
    suspend fun getMessages(chatRoomId: Long, page: Int, size: Int): List<ChatMessageDto> {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        return chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(chatRoomId, pageable)
            .map { ChatMessageDto.from(it) }
            .toList()
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
        before: LocalDateTime?,
        size: Int
    ): List<ChatMessageDto> {
        val pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        val flow: Flow<ChatMessage> = if (before != null) {
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

        return flow.map { ChatMessageDto.from(it) }.toList()
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
    ): List<ChatMessageDto> {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        return chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
                chatRoomId,
                keyword,
                pageable
            )
            .map { ChatMessageDto.from(it) }
            .toList()
    }

    /**
     * 안읽은 메시지 개수 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param lastReadAt 마지막으로 읽은 시간
     * @return 안읽은 메시지 개수
     */
    suspend fun getUnreadCount(chatRoomId: Long, lastReadAt: LocalDateTime?): Long {
        if (lastReadAt == null) {
            return 0L
        }

        return chatMessageRepository.countByChatRoomIdAndCreatedAtAfter(chatRoomId, lastReadAt)
    }
}