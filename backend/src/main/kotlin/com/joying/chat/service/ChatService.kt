package com.joying.chat.service

import com.joying.chat.document.ChatMessage
import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 채팅 통합 Service
 *
 * MongoDB 직접 저장 + Redis Pub/Sub 메시지 발행
 */
@Service
class ChatService(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val chatMessageRepository: ChatMessageRepository,
    private val redisPubSubPublisher: RedisPubSubPublisher
) {
    private val logger = LoggerFactory.getLogger(ChatService::class.java)

    /**
     * 메시지 전송
     * (MongoDB 저장 + Redis Pub/Sub 발행)
     *
     * @param chatRoomId 채팅방 ID
     * @param senderId 발신자 ID
     * @param request 메시지 내용
     * @return 저장된 메시지 DTO
     */
    suspend fun sendMessage(
        chatRoomId: Long,
        senderId: Long,
        request: SendMessageRequest
    ): ChatMessageDto {
        // 채팅방 존재 확인 및 권한 확인
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 권한 확인 (구매자 또는 판매자만 메시지 전송 가능)
        if (chatRoom.buyer.getMemberId() != senderId && chatRoom.seller.getMemberId() != senderId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "메시지 전송 권한이 없습니다")
        }

        // 채팅방 활성 상태 확인
        if (!chatRoom.isActive()) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "종료된 채팅방입니다")
        }

        // ChatMessage 생성
        val chatMessage = when (request.type) {
            com.joying.chat.document.MessageType.TEXT -> {
                ChatMessage.createTextMessage(
                    chatRoomId = chatRoomId,
                    senderId = senderId,
                    content = request.content,
                    replyToMessageId = request.replyToMessageId
                )
            }
            com.joying.chat.document.MessageType.IMAGE -> {
                ChatMessage.createImageMessage(
                    chatRoomId = chatRoomId,
                    senderId = senderId,
                    imageUrl = request.imageUrl ?: throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "이미지 URL이 필요합니다"),
                    fileName = request.fileName ?: "image.jpg",
                    fileSize = request.fileSize ?: 0L,
                    replyToMessageId = request.replyToMessageId
                )
            }
            com.joying.chat.document.MessageType.FILE -> {
                ChatMessage.createFileMessage(
                    chatRoomId = chatRoomId,
                    senderId = senderId,
                    fileUrl = request.fileUrl ?: throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "파일 URL이 필요합니다"),
                    fileName = request.fileName ?: "file",
                    fileSize = request.fileSize ?: 0L,
                    replyToMessageId = request.replyToMessageId
                )
            }
            com.joying.chat.document.MessageType.SYSTEM -> {
                ChatMessage.createSystemMessage(
                    chatRoomId = chatRoomId,
                    content = request.content
                )
            }
        }

        // 현재 시간 설정
        chatMessage.createdAt = Instant.now()

        // 1. MongoDB에 저장 (영구 저장) - withContext로 blocking I/O 처리
        val savedMessage = withContext(Dispatchers.IO) {
            chatMessageRepository.save(chatMessage)
        }

        // 2. DTO 변환
        val messageDto = ChatMessageDto.from(savedMessage)

        // 3. Redis Pub/Sub로 발행 (실시간 전달)
        redisPubSubPublisher.publish(messageDto)

        logger.info(
            "메시지 전송 완료: messageId={}, chatRoomId={}, senderId={}",
            savedMessage.id,
            chatRoomId,
            senderId
        )

        // 4. 채팅방의 lastMessage 업데이트
        withContext(Dispatchers.IO) {
            try {
                chatRoom.updateLastMessage(savedMessage.content, savedMessage.createdAt!!)
                chatRoomRepository.save(chatRoom)
            } catch (e: Exception) {
                logger.error("채팅방 lastMessage 업데이트 실패: {}", e.message)
            }
        }

        return messageDto
    }

    /**
     * 메시지 읽음 처리
     * (lastReadAt 업데이트)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    @Transactional
    fun markAsRead(chatRoomId: Long, memberId: Long) {
        val chatRoomMember = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        chatRoomMember.markAsRead()

        logger.debug("메시지 읽음 처리: chatRoomId={}, memberId={}", chatRoomId, memberId)
    }

    /**
     * 채팅방 고정/해제 토글
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @return 고정 여부
     */
    @Transactional
    fun togglePin(chatRoomId: Long, memberId: Long): Boolean {
        val chatRoomMember = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        chatRoomMember.togglePin()

        logger.info("채팅방 고정 토글: chatRoomId={}, memberId={}, isPinned={}", chatRoomId, memberId, chatRoomMember.isPinned)

        return chatRoomMember.isPinned
    }

    /**
     * 채팅방 알림 끄기/켜기 토글
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @return 알림 끄기 여부
     */
    @Transactional
    fun toggleMute(chatRoomId: Long, memberId: Long): Boolean {
        val chatRoomMember = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        chatRoomMember.toggleMute()

        logger.info("채팅방 알림 토글: chatRoomId={}, memberId={}, isMuted={}", chatRoomId, memberId, chatRoomMember.isMuted)

        return chatRoomMember.isMuted
    }
}