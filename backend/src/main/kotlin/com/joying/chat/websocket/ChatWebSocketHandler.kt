package com.joying.chat.websocket

import com.joying.chat.broadcast.ChatBroadcaster

import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.service.ChatPresenceService
import com.joying.chat.service.ChatService
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
    private val messagingTemplate: SimpMessagingTemplate,
    private val chatBroadcaster: ChatBroadcaster,
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
     * @param headerAccessor WebSocket 헤더 (인증 정보 추출용)
     */
    @MessageMapping("/chat/{chatRoomId}/send")
    fun sendMessage(
        @DestinationVariable chatRoomId: Long,
        @Payload request: SendMessageRequest,
        headerAccessor: SimpMessageHeaderAccessor
    ) {
        // 인증된 사용자 ID 추출
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

        chatBroadcaster.toTopic("/topic/chat/$chatRoomId/typing", typingEvent)
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

        chatBroadcaster.toTopic("/topic/chat/$chatRoomId/read", readEvent)
    }

    /**
     * 온라인 상태 Heartbeat
     *
     * SEND /app/chat/heartbeat
     * 클라이언트가 주기적으로 호출하여 온라인 상태 유지 (30초마다 권장)
     *
     * @param payload chatRoomId를 포함할 수 있는 payload (Optional)
     * @param headerAccessor WebSocket 헤더
     */
    @MessageMapping("/chat/heartbeat")
    fun heartbeat(@Payload payload: Map<String, Any>?, headerAccessor: SimpMessageHeaderAccessor) {
        val memberId = extractMemberIdFromToken(headerAccessor)

        logger.debug("Heartbeat: memberId={}, payload={}", memberId, payload)

        // 온라인 상태 갱신
        chatPresenceService.heartbeat(memberId)

        // chatRoomId가 있으면 채팅방 활성 상태도 갱신
        payload?.get("chatRoomId")?.let { chatRoomId ->
            val chatRoomIdLong = when (chatRoomId) {
                is Number -> chatRoomId.toLong()
                is String -> chatRoomId.toLongOrNull()
                else -> null
            }
            if (chatRoomIdLong != null) {
                logger.debug("Heartbeat: refreshing chat room activity: memberId={}, chatRoomId={}", memberId, chatRoomIdLong)
                chatPresenceService.refreshChatRoomActivity(memberId, chatRoomIdLong)
            }
        }
    }

    /**
     * WebSocket 세션에서 인증된 사용자 ID 반환
     *
     * WebSocketAuthInterceptor가 CONNECT 시점에 쿠키에서 JWT를 추출하여
     * headerAccessor.user에 인증 정보를 저장합니다.
     *
     * @param headerAccessor WebSocket 헤더
     * @return 사용자 ID
     */
    private fun extractMemberIdFromToken(headerAccessor: SimpMessageHeaderAccessor): Long {
        // WebSocketAuthInterceptor에서 설정한 인증 정보 가져오기
        val authentication = headerAccessor.user
            ?: throw IllegalArgumentException("인증되지 않은 사용자입니다")

        // Authentication.name에 memberId가 문자열로 저장되어 있음
        return authentication.name.toLong()
    }
}