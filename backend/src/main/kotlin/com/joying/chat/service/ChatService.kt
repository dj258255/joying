package com.joying.chat.service

import com.joying.chat.document.ChatMessage
import com.joying.chat.document.MessageType
import com.joying.chat.dto.ChatMessageResponse
import com.joying.chat.dto.ChatRoomSettingsResponse
import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 채팅 통합 Service
 *
 * MongoDB 직접 저장 + Redis Pub/Sub 메시지 발행 + Redis 안읽은 개수 관리
 *
 * 최적화 적용:
 * - Redis 권한 캐싱 (30-50ms → 1-2ms)
 * - lastMessage 비동기 업데이트 (20-30ms 절감)
 */
@Service
class ChatService(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val chatMessageRepository: ChatMessageRepository,
    private val redisPubSubPublisher: RedisPubSubPublisher,
    private val unreadCountService: UnreadCountService,
    private val permissionCache: ChatRoomPermissionCache,
) {
    private val logger = LoggerFactory.getLogger(ChatService::class.java)

    /**
     * 메시지 전송 (최적화 버전)
     * (MongoDB 저장 + Redis Pub/Sub 발행)
     *
     * 최적화:
     * - Redis 권한 캐싱 (30-50ms → 1-2ms)
     * - lastMessage 비동기 업데이트 (20-30ms 절감)
     *
     * @param chatRoomId 채팅방 ID
     * @param senderId 발신자 ID
     * @param request 메시지 내용
     * @return 저장된 메시지 DTO
     */
    suspend fun sendMessage(
        chatRoomId: Long,
        senderId: Long,
        request: SendMessageRequest,
    ): ChatMessageResponse {
        // 1. 권한 확인 (Redis 캐시 우선) - 30-50ms → 1-2ms
        if (!permissionCache.hasPermission(chatRoomId, senderId)) {
            throw BusinessException(ErrorCode.FORBIDDEN, "메시지 전송 권한이 없습니다")
        }

        // 2. 채팅방 활성 상태 확인 (권한 확인 시 이미 조회했으므로 캐시에서 가져올 수 있음)
        val chatRoom =
            withContext(Dispatchers.IO) {
                chatRoomRepository
                    .findById(chatRoomId)
                    .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }
            }

        if (!chatRoom.isActive()) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "종료된 채팅방입니다")
        }

        // ChatMessage 생성
        val chatMessage =
            when (request.type) {
                MessageType.TEXT -> {
                    ChatMessage.createTextMessage(
                        chatRoomId = chatRoomId,
                        senderId = senderId,
                        content = request.content,
                        replyToMessageId = request.replyToMessageId,
                    )
                }
                MessageType.IMAGE -> {
                    ChatMessage.createImageMessage(
                        chatRoomId = chatRoomId,
                        senderId = senderId,
                        imageUrl = request.imageUrl ?: throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "이미지 URL이 필요합니다"),
                        fileName = request.fileName ?: "image.jpg",
                        fileSize = request.fileSize ?: 0L,
                        replyToMessageId = request.replyToMessageId,
                    )
                }
                MessageType.FILE -> {
                    ChatMessage.createFileMessage(
                        chatRoomId = chatRoomId,
                        senderId = senderId,
                        fileUrl = request.fileUrl ?: throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "파일 URL이 필요합니다"),
                        fileName = request.fileName ?: "file",
                        fileSize = request.fileSize ?: 0L,
                        replyToMessageId = request.replyToMessageId,
                    )
                }
                MessageType.SYSTEM -> {
                    ChatMessage.createSystemMessage(
                        chatRoomId = chatRoomId,
                        content = request.content,
                    )
                }
            }

        // 현재 시간 설정
        chatMessage.createdAt = Instant.now()

        // 3. MongoDB에 저장 (영구 저장) - withContext로 blocking I/O 처리
        val savedMessage =
            withContext(Dispatchers.IO) {
                chatMessageRepository.save(chatMessage)
            }

        // 4. 답장 대상 메시지 조회 (있을 경우)
        val replyMessage =
            savedMessage.replyToMessageId?.let { replyId ->
                withContext(Dispatchers.IO) {
                    chatMessageRepository.findById(replyId).orElse(null)
                }
            }

        // 5. DTO 변환 (답장 정보 포함)
        val messageDto = ChatMessageResponse.from(savedMessage, replyMessage)

        // 6. Redis Pub/Sub로 발행 (실시간 전달)
        redisPubSubPublisher.publish(messageDto)

        logger.info(
            "메시지 전송 완료: messageId={}, chatRoomId={}, senderId={}",
            savedMessage.id,
            chatRoomId,
            senderId,
        )

        // 6. 상대방 안읽은 개수 증가 (Redis)
        val receiverId =
            if (senderId == chatRoom.buyer.getMemberId()) {
                chatRoom.seller.getMemberId()!!
            } else {
                chatRoom.buyer.getMemberId()!!
            }

        unreadCountService.increment(chatRoomId, receiverId)

        // 7. lastMessage 업데이트 (비동기) - 20-30ms 절감
        CoroutineScope(Dispatchers.IO).launch {
            try {
                updateLastMessageAsync(chatRoomId, savedMessage.content, savedMessage.createdAt!!)
            } catch (e: Exception) {
                logger.error("채팅방 lastMessage 업데이트 실패: chatRoomId={}, error={}", chatRoomId, e.message, e)
            }
        }

        return messageDto
    }

    /**
     * lastMessage 비동기 업데이트
     * (메시지 전송 응답 속도에 영향 없음)
     */
    private suspend fun updateLastMessageAsync(
        chatRoomId: Long,
        content: String,
        createdAt: Instant,
    ) {
        withContext(Dispatchers.IO) {
            val chatRoom =
                chatRoomRepository.findById(chatRoomId).orElse(null)
                    ?: return@withContext

            chatRoom.updateLastMessage(content, createdAt)
            chatRoomRepository.save(chatRoom)

            logger.debug("lastMessage 비동기 업데이트 완료: chatRoomId={}", chatRoomId)
        }
    }

    /**
     * 메시지 읽음 처리
     * (lastReadAt 업데이트)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    @Transactional
    fun markAsRead(
        chatRoomId: Long,
        memberId: Long,
    ) {
        val chatRoomMember =
            chatRoomMemberRepository
                .findByChatRoomIdAndMemberId(chatRoomId, memberId)
                .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        // MySQL lastReadAt 업데이트
        chatRoomMember.markAsRead()

        // Redis 안읽은 개수 초기화
        unreadCountService.reset(chatRoomId, memberId)

        logger.debug("메시지 읽음 처리: chatRoomId={}, memberId={}", chatRoomId, memberId)
    }

    /**
     * 채팅방 설정 업데이트 (통합)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @param isPinned 고정 여부 (null이면 변경 안함)
     * @param isMuted 알림 끄기 여부 (null이면 변경 안함)
     * @return 업데이트된 설정
     */
    @Transactional
    fun updateSettings(
        chatRoomId: Long,
        memberId: Long,
        isPinned: Boolean?,
        isMuted: Boolean?,
    ): ChatRoomSettingsResponse {
        val chatRoomMember =
            chatRoomMemberRepository
                .findByChatRoomIdAndMemberId(chatRoomId, memberId)
                .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        // 고정 설정 업데이트
        if (isPinned != null && chatRoomMember.isPinned != isPinned) {
            chatRoomMember.togglePin()
            logger.info("채팅방 고정 변경: chatRoomId={}, memberId={}, isPinned={}", chatRoomId, memberId, isPinned)
        }

        // 알림 설정 업데이트
        if (isMuted != null && chatRoomMember.isMuted != isMuted) {
            chatRoomMember.toggleMute()
            logger.info("채팅방 알림 변경: chatRoomId={}, memberId={}, isMuted={}", chatRoomId, memberId, isMuted)
        }

        return ChatRoomSettingsResponse(
            isPinned = chatRoomMember.isPinned,
            isMuted = chatRoomMember.isMuted,
        )
    }
}
