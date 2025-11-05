package com.joying.chat.service

import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
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
    private val chatMessageRepository: ChatMessageRepository,
    private val chatRoomRepository: ChatRoomRepository
) {

    /**
     * 채팅방 접근 권한 확인
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @throws BusinessException 권한이 없는 경우
     */
    private fun validateChatRoomAccess(chatRoomId: Long, memberId: Long) {
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 구매자 또는 판매자만 접근 가능
        if (chatRoom.buyer.getMemberId() != memberId && chatRoom.seller.getMemberId() != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "채팅방 접근 권한이 없습니다")
        }
    }

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
     * 커서 기반 페이징으로 메시지 조회 (통합)
     *
     * - before 파라미터: 과거 메시지 조회 (무한 스크롤)
     * - after 파라미터: 놓친 메시지 조회 (재연결 시)
     *
     * @param chatRoomId 채팅방 ID
     * @param before 이 시간 이전의 메시지 조회 (과거 방향, 최신순 정렬)
     * @param after 이 시간 이후의 메시지 조회 (놓친 메시지, 오래된 순 정렬)
     * @param size 가져올 개수
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 메시지 목록
     */
    suspend fun getMessagesBefore(
        chatRoomId: Long,
        before: Instant? = null,
        after: Instant? = null,
        size: Int,
        memberId: Long
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)

        // before와 after 동시 사용 불가
        if (before != null && after != null) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "before와 after 파라미터는 동시에 사용할 수 없습니다")
        }

        val messages = when {
            // after: 놓친 메시지 조회 (오래된 순)
            after != null -> {
                val pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.ASC, "createdAt"))
                chatMessageRepository.findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
                    chatRoomId,
                    after,
                    pageable
                )
            }
            // before: 과거 메시지 조회 (최신순)
            before != null -> {
                val pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))
                chatMessageRepository.findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
                    chatRoomId,
                    before,
                    pageable
                )
            }
            // 둘 다 null: 최신 메시지 조회 (최신순)
            else -> {
                val pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))
                chatMessageRepository.findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
                    chatRoomId,
                    pageable
                )
            }
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
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 검색 결과
     */
    suspend fun searchMessages(
        chatRoomId: Long,
        keyword: String,
        page: Int,
        size: Int,
        memberId: Long
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)
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
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 놓친 메시지 목록 (오래된 순)
     */
    suspend fun getMessagesAfter(
        chatRoomId: Long,
        after: Instant,
        limit: Int = 100,
        memberId: Long
    ): List<ChatMessageDto> = withContext(Dispatchers.IO) {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)
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