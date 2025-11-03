package com.joying.chat.websocket

import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.service.ChatService
import com.joying.common.config.security.JwtTokenProvider
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller

/**
 * WebSocket STOMP 메시지 핸들러
 *
 * 실시간 채팅 메시지 송수신
 */
@Controller
class ChatWebSocketHandler(
    private val chatService: ChatService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val messagingTemplate: SimpMessagingTemplate
) {
    private val logger = LoggerFactory.getLogger(ChatWebSocketHandler::class.java)

    /**
     * 메시지 전송
     *
     * SEND /app/chat/{chatRoomId}/send
     * → SUBSCRIBE /topic/chat/{chatRoomId}
     *
     * @param chatRoomId 채팅방 ID
     * @param request 메시지 내용
     * @param headerAccessor WebSocket 헤더 (JWT 토큰 추출용)
     * @return 전송된 메시지
     */
    @MessageMapping("/chat/{chatRoomId}/send")
    @SendTo("/topic/chat/{chatRoomId}")
    fun sendMessage(
        @DestinationVariable chatRoomId: Long,
        @Payload request: SendMessageRequest,
        headerAccessor: SimpMessageHeaderAccessor
    ): ChatMessageDto = runBlocking {
        // JWT 토큰에서 사용자 ID 추출
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug(
            "메시지 전송 요청: chatRoomId={}, memberId={}, type={}",
            chatRoomId,
            memberId,
            request.type
        )

        // 메시지 전송 (Redis Stream 발행)
        val message = chatService.sendMessage(chatRoomId, memberId, request)

        logger.info(
            "메시지 전송 완료: chatRoomId={}, messageId={}, senderId={}",
            chatRoomId,
            message.id,
            memberId
        )

        message
    }

    /**
     * 타이핑 중 표시
     *
     * SEND /app/chat/{chatRoomId}/typing
     * → SUBSCRIBE /topic/chat/{chatRoomId}/typing
     *
     * @param chatRoomId 채팅방 ID
     * @param headerAccessor WebSocket 헤더
     */
    @MessageMapping("/chat/{chatRoomId}/typing")
    fun sendTypingIndicator(
        @DestinationVariable chatRoomId: Long,
        headerAccessor: SimpMessageHeaderAccessor
    ) {
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug("타이핑 중: chatRoomId={}, memberId={}", chatRoomId, memberId)

        // 타이핑 상태 브로드캐스트
        val typingEvent = mapOf(
            "chatRoomId" to chatRoomId,
            "memberId" to memberId,
            "isTyping" to true
        )

        messagingTemplate.convertAndSend("/topic/chat/$chatRoomId/typing", typingEvent)
    }

    /**
     * 메시지 읽음 처리
     *
     * SEND /app/chat/{chatRoomId}/read
     * → SUBSCRIBE /topic/chat/{chatRoomId}/read
     *
     * @param chatRoomId 채팅방 ID
     * @param headerAccessor WebSocket 헤더
     */
    @MessageMapping("/chat/{chatRoomId}/read")
    fun markAsRead(
        @DestinationVariable chatRoomId: Long,
        headerAccessor: SimpMessageHeaderAccessor
    ) {
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug("읽음 처리: chatRoomId={}, memberId={}", chatRoomId, memberId)

        // 읽음 처리
        chatService.markAsRead(chatRoomId, memberId)

        // 읽음 상태 브로드캐스트
        val readEvent = mapOf(
            "chatRoomId" to chatRoomId,
            "memberId" to memberId,
            "readAt" to System.currentTimeMillis()
        )

        messagingTemplate.convertAndSend("/topic/chat/$chatRoomId/read", readEvent)
    }

    /**
     * WebSocket 헤더에서 JWT 토큰 추출 후 사용자 ID 반환
     *
     * @param headerAccessor WebSocket 헤더
     * @return 사용자 ID
     */
    private fun extractMemberIdFromToken(headerAccessor: SimpMessageHeaderAccessor): Long {
        // native headers에서 Authorization 헤더 추출
        val authHeader = headerAccessor.getNativeHeader("Authorization")?.firstOrNull()
            ?: throw IllegalArgumentException("Authorization 헤더가 없습니다")

        // "Bearer " 제거
        val token = authHeader.replace("Bearer ", "")

        // JWT에서 사용자 ID 추출
        return jwtTokenProvider.getMemberId(token)
    }
}