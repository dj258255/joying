package com.joying.chat.websocket

import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.service.ChatPresenceService
import com.joying.chat.service.ChatService
import com.joying.common.config.security.JwtTokenProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
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
    private val messagingTemplate: SimpMessagingTemplate,
    private val chatPresenceService: ChatPresenceService
) {
    private val logger = LoggerFactory.getLogger(ChatWebSocketHandler::class.java)

    /**
     * 메시지 전송
     *
     * SEND /app/chat/{chatRoomId}/send
     * → Redis Pub/Sub를 통해 모든 구독자에게 전달됨
     *
     * @param chatRoomId 채팅방 ID
     * @param request 메시지 내용
     * @param headerAccessor WebSocket 헤더 (JWT 토큰 추출용)
     */
    @MessageMapping("/chat/{chatRoomId}/send")
    fun sendMessage(
        @DestinationVariable chatRoomId: Long,
        @Payload request: SendMessageRequest,
        headerAccessor: SimpMessageHeaderAccessor
    ) {
        // JWT 토큰에서 사용자 ID 추출
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug(
            "메시지 전송 요청: chatRoomId={}, memberId={}, type={}",
            chatRoomId,
            memberId,
            request.type
        )

        // 비동기로 메시지 전송 (MongoDB 저장 + Redis Pub/Sub 발행)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val message = chatService.sendMessage(chatRoomId, memberId, request)

                logger.info(
                    "메시지 전송 완료: chatRoomId={}, messageId={}, senderId={}",
                    chatRoomId,
                    message.id,
                    memberId
                )
            } catch (e: Exception) {
                logger.error(
                    "메시지 전송 실패: chatRoomId={}, memberId={}, error={}",
                    chatRoomId,
                    memberId,
                    e.message,
                    e
                )
            }
        }
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
     * 온라인 상태 Heartbeat
     *
     * SEND /app/chat/heartbeat
     * 클라이언트가 주기적으로 호출하여 온라인 상태 유지 (30초마다 권장)
     *
     * @param headerAccessor WebSocket 헤더
     */
    @MessageMapping("/chat/heartbeat")
    fun heartbeat(headerAccessor: SimpMessageHeaderAccessor) {
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug("Heartbeat: memberId={}", memberId)

        // 온라인 상태 갱신
        chatPresenceService.heartbeat(memberId)
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