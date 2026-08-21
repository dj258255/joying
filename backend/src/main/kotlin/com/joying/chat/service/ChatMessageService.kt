package com.joying.chat.service

import com.joying.chat.document.MessageType
import com.joying.chat.dto.ChatMessageResponse
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import java.time.Instant

/**
 * 채팅 메시지 Service
 *
 * 저장소가 전부 블로킹이라 그대로 부른다. 서로 의존하지 않는 조회만 동시에 날린다.
 */
@Service
class ChatMessageService(
    private val chatMessageRepository: ChatMessageRepository,
    private val chatRoomRepository: ChatRoomRepository,
    private val redisPubSubPublisher: RedisPubSubPublisher
) {
    private val logger = LoggerFactory.getLogger(ChatMessageService::class.java)

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
    fun getMessages(chatRoomId: Long, page: Int, size: Int): List<ChatMessageResponse> =
        run {
            val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

            chatMessageRepository
                .findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(chatRoomId, pageable)
                .map { message ->
                    val replyMessage = message.replyToMessageId?.let { replyId ->
                        chatMessageRepository.findById(replyId).orElse(null)
                    }
                    ChatMessageResponse.from(message, replyMessage)
                }
        }

    /**
     * 커서 기반 페이징으로 메시지 조회 (통합)
     *
     * - before 파라미터: 과거 메시지 조회 (무한 스크롤)
     * - after 파라미터: 놓친 메시지 조회 (재연결 시)
     *
     * 예전에는 이 자리를 코루틴이 맡았다. 밑에 있는 저장소가 전부 블로킹이라
     * 코루틴이 사 주는 것이 없었고, 톰캣 워커를 잡아 둔 채 IO 스레드를 하나 더
     * 쓰고 있었다. 지금은 그냥 부른다.
     *
     * @param chatRoomId 채팅방 ID
     * @param before 이 시간 이전의 메시지 조회 (과거 방향, 최신순 정렬)
     * @param after 이 시간 이후의 메시지 조회 (놓친 메시지, 오래된 순 정렬)
     * @param size 가져올 개수
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 메시지 목록
     */
    fun getMessagesBefore(
        chatRoomId: Long,
        before: Instant? = null,
        after: Instant? = null,
        size: Int,
        memberId: Long
    ): List<ChatMessageResponse> = run {
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

        messages.map { message ->
            val replyMessage = message.replyToMessageId?.let { replyId ->
                chatMessageRepository.findById(replyId).orElse(null)
            }
            ChatMessageResponse.from(message, replyMessage)
        }
    }

    /**
     * 채팅방에서 메시지 검색
     *
     * 예전에는 이 자리를 코루틴이 맡았다. 밑에 있는 저장소가 전부 블로킹이라
     * 코루틴이 사 주는 것이 없었고, 톰캣 워커를 잡아 둔 채 IO 스레드를 하나 더
     * 쓰고 있었다. 지금은 그냥 부른다.
     *
     * @param chatRoomId 채팅방 ID
     * @param keyword 검색어
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 검색 결과
     */
    fun searchMessages(
        chatRoomId: Long,
        keyword: String,
        page: Int,
        size: Int,
        memberId: Long
    ): List<ChatMessageResponse> = run {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))

        chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
                chatRoomId,
                keyword,
                pageable
            )
            .map { message ->
                val replyMessage = message.replyToMessageId?.let { replyId ->
                    chatMessageRepository.findById(replyId).orElse(null)
                }
                ChatMessageResponse.from(message, replyMessage)
            }
    }

    /**
     * 안읽은 메시지 개수 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param lastReadAt 마지막으로 읽은 시간
     * @return 안읽은 메시지 개수
     */
    fun getUnreadCount(chatRoomId: Long, lastReadAt: Instant?): Long =
        run {
            if (lastReadAt == null) {
                return 0L
            }

            chatMessageRepository.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfter(chatRoomId, lastReadAt)
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
    fun getMessagesAfter(
        chatRoomId: Long,
        after: Instant,
        limit: Int = 100,
        memberId: Long
    ): List<ChatMessageResponse> = run {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)
        val pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "createdAt"))

        chatMessageRepository
            .findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
                chatRoomId,
                after,
                pageable
            )
            .map { message ->
                val replyMessage = message.replyToMessageId?.let { replyId ->
                    chatMessageRepository.findById(replyId).orElse(null)
                }
                ChatMessageResponse.from(message, replyMessage)
            }
    }

    /**
     * 특정 메시지 주변 조회 (답장 점프, 검색 결과 점프용)
     *
     * 특정 메시지를 중심으로 앞뒤 메시지를 함께 조회
     * - before개: 해당 메시지 이전 메시지들 (과거)
     * - target: 해당 메시지
     * - after개: 해당 메시지 이후 메시지들 (미래)
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 중심이 될 메시지 ID
     * @param before 이전 메시지 개수 (기본 20)
     * @param after 이후 메시지 개수 (기본 20)
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @return 중심 메시지 + 주변 메시지 목록 (시간순 정렬)
     */
    fun getMessagesAround(
        chatRoomId: Long,
        messageId: String,
        before: Int = 20,
        after: Int = 20,
        memberId: Long
    ): List<ChatMessageResponse> = run {
        // 권한 확인
        validateChatRoomAccess(chatRoomId, memberId)

        // 중심 메시지 조회
        val targetMessage = chatMessageRepository.findById(messageId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "메시지를 찾을 수 없습니다") }

        // 채팅방 확인
        if (targetMessage.chatRoomId != chatRoomId) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "해당 채팅방의 메시지가 아닙니다")
        }

        val targetTime = targetMessage.createdAt
            ?: throw BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "메시지 생성 시간이 없습니다")

        // 1. 이전 메시지 조회 (과거 → 현재 방향으로 before개)
        val beforeMessages = if (before > 0) {
            val pageable = PageRequest.of(0, before, Sort.by(Sort.Direction.DESC, "createdAt"))
            chatMessageRepository.findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
                chatRoomId,
                targetTime,
                pageable
            ).reversed() // 시간순으로 뒤집기
        } else {
            emptyList()
        }

        // 2. 이후 메시지 조회 (현재 → 미래 방향으로 after개)
        val afterMessages = if (after > 0) {
            val pageable = PageRequest.of(0, after, Sort.by(Sort.Direction.ASC, "createdAt"))
            chatMessageRepository.findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
                chatRoomId,
                targetTime,
                pageable
            )
        } else {
            emptyList()
        }

        // 3. 모든 메시지 합치기 (이전 메시지 + 중심 메시지 + 이후 메시지)
        val allMessages = beforeMessages + listOf(targetMessage) + afterMessages

        // 4. DTO 변환 (답장 정보 포함)
        allMessages.map { message ->
            val replyMessage = message.replyToMessageId?.let { replyId ->
                chatMessageRepository.findById(replyId).orElse(null)
            }
            ChatMessageResponse.from(message, replyMessage)
        }
    }

    /**
     * 메시지 삭제 (Soft Delete) - 현업 표준 버전
     *
     * 예전에는 이 자리를 코루틴이 맡았다. 밑에 있는 저장소가 전부 블로킹이라
     * 코루틴이 사 주는 것이 없었고, 톰캣 워커를 잡아 둔 채 IO 스레드를 하나 더
     * 쓰고 있었다. 지금은 그냥 부른다.
     *
     * 개선 사항:
     * - 삭제 후 Redis Pub/Sub 발행 (실시간 동기화)
     * - 답장 정보 포함
     * - 에러 처리 강화
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @param memberId 요청한 회원 ID (권한 확인용)
     */
    fun deleteMessage(chatRoomId: Long, messageId: String, memberId: Long) =
        run {
            try {
                val message = chatMessageRepository.findById(messageId)
                    .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "메시지를 찾을 수 없습니다") }

                // 채팅방 확인
                if (message.chatRoomId != chatRoomId) {
                    throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "해당 채팅방의 메시지가 아닙니다")
                }

                // 본인 메시지만 삭제 가능
                if (message.senderId != memberId) {
                    throw BusinessException(ErrorCode.FORBIDDEN, "본인의 메시지만 삭제할 수 있습니다")
                }

                // 이미 삭제된 메시지
                if (message.isDeleted) {
                    throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "이미 삭제된 메시지입니다")
                }

                // Soft Delete
                message.delete()
                val savedMessage = chatMessageRepository.save(message)

                logger.info(
                    "메시지 삭제 완료: messageId={}, chatRoomId={}, memberId={}",
                    messageId,
                    chatRoomId,
                    memberId
                )

                // 답장 메시지 조회
                val replyMessage = savedMessage.replyToMessageId?.let { replyId ->
                    chatMessageRepository.findById(replyId).orElse(null)
                }

                // 수신자 ID 계산 (실시간 동기화용)
                val chatRoom = chatRoomRepository.findById(chatRoomId)
                    .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

                val receiverId = if (memberId == chatRoom.buyer.memberId) {
                    chatRoom.seller.memberId!!
                } else {
                    chatRoom.buyer.memberId!!
                }

                // Redis Pub/Sub 발행 (실시간 동기화)
                val response = ChatMessageResponse.from(savedMessage, replyMessage).toBuilder().receiverId(receiverId).build()
                redisPubSubPublisher.publish(response)

                logger.debug("메시지 삭제 이벤트 발행: messageId={}", messageId)

            } catch (e: BusinessException) {
                throw e
            } catch (e: Exception) {
                logger.error(
                    "메시지 삭제 실패: messageId={}, chatRoomId={}, memberId={}, error={}",
                    messageId,
                    chatRoomId,
                    memberId,
                    e.message,
                    e
                )
                throw BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "메시지 삭제 중 오류가 발생했습니다")
            }
        }

    /**
     * 메시지 수정 - 현업 표준 버전
     *
     * 예전에는 이 자리를 코루틴이 맡았다. 밑에 있는 저장소가 전부 블로킹이라
     * 코루틴이 사 주는 것이 없었고, 톰캣 워커를 잡아 둔 채 IO 스레드를 하나 더
     * 쓰고 있었다. 지금은 그냥 부른다.
     *
     * 개선 사항:
     * - 첫 수정 시 원본 내용 저장 (originalContent)
     * - 수정 시간 기록 (updatedAt)
     * - 수정 플래그 설정 (isEdited)
     * - Redis Pub/Sub 발행 (실시간 동기화)
     * - 답장 정보 포함
     * - 에러 처리 강화
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @param memberId 요청한 회원 ID (권한 확인용)
     * @param newContent 수정할 내용
     * @return 수정된 메시지 DTO
     */
    fun updateMessage(
        chatRoomId: Long,
        messageId: String,
        memberId: Long,
        newContent: String
    ): ChatMessageResponse = run {
        try {
            // 공백 검증
            if (newContent.isBlank()) {
                throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "메시지 내용은 비어 있을 수 없습니다")
            }

            val message = chatMessageRepository.findById(messageId)
                .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "메시지를 찾을 수 없습니다") }

            // 채팅방 확인
            if (message.chatRoomId != chatRoomId) {
                throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "해당 채팅방의 메시지가 아닙니다")
            }

            // 본인 메시지만 수정 가능
            if (message.senderId != memberId) {
                throw BusinessException(ErrorCode.FORBIDDEN, "본인의 메시지만 수정할 수 있습니다")
            }

            // 텍스트 메시지만 수정 가능
            if (message.type != MessageType.TEXT) {
                throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "텍스트 메시지만 수정할 수 있습니다")
            }

            // 삭제된 메시지는 수정 불가
            if (message.isDeleted) {
                throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "삭제된 메시지는 수정할 수 없습니다")
            }

            // 내용이 동일하면 수정하지 않음
            if (message.content == newContent) {
                throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "수정할 내용이 기존 내용과 동일합니다")
            }

            // 수정 (MongoDB data class는 불변이므로 새 객체 생성)
            val updatedMessage = message.copy(
                content = newContent,
                updatedAt = Instant.now(),
                isEdited = true,
                // 첫 수정 시에만 원본 저장 (이후 수정은 최초 원본 유지)
                originalContent = message.originalContent ?: message.content
            )

            val savedMessage = chatMessageRepository.save(updatedMessage)

            logger.info(
                "메시지 수정 완료: messageId={}, chatRoomId={}, memberId={}, isFirstEdit={}",
                messageId,
                chatRoomId,
                memberId,
                message.originalContent == null
            )

            // 답장 메시지 조회
            val replyMessage = savedMessage.replyToMessageId?.let { replyId ->
                chatMessageRepository.findById(replyId).orElse(null)
            }

            // 수신자 ID 계산 (실시간 동기화용)
            val chatRoom = chatRoomRepository.findById(chatRoomId)
                .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

            val receiverId = if (memberId == chatRoom.buyer.memberId) {
                chatRoom.seller.memberId!!
            } else {
                chatRoom.buyer.memberId!!
            }

            // Redis Pub/Sub 발행 (실시간 동기화)
            val response = ChatMessageResponse.from(savedMessage, replyMessage).toBuilder().receiverId(receiverId).build()
            redisPubSubPublisher.publish(response)

            logger.debug("메시지 수정 이벤트 발행: messageId={}", messageId)

            response

        } catch (e: BusinessException) {
            throw e
        } catch (e: Exception) {
            logger.error(
                "메시지 수정 실패: messageId={}, chatRoomId={}, memberId={}, error={}",
                messageId,
                chatRoomId,
                memberId,
                e.message,
                e
            )
            throw BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "메시지 수정 중 오류가 발생했습니다")
        }
    }
}