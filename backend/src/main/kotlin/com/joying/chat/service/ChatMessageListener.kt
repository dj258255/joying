package com.joying.chat.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.joying.chat.dto.ChatMessageDto
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

/**
 * Redis Pub/Sub 메시지 리스너
 *
 * Redis에서 발행된 채팅 메시지를 수신하여 WebSocket으로 브로드캐스트
 * - Redis Pub/Sub 구독자
 * - 모든 서버 인스턴스가 독립적으로 메시지 수신
 * - 각 서버가 자신의 WebSocket 클라이언트에게 전송
 */
@Component
class ChatMessageListener(
    private val messagingTemplate: SimpMessagingTemplate,
    private val objectMapper: ObjectMapper
) : MessageListener {

    private val logger = LoggerFactory.getLogger(ChatMessageListener::class.java)

    /**
     * Redis에서 메시지 수신 시 호출
     *
     * @param message Redis 메시지
     * @param pattern 구독 패턴 (채널 이름)
     */
    override fun onMessage(message: Message, pattern: ByteArray?) {
        try {
            // JSON 바이트 배열 → ChatMessageDto
            val messageDto = objectMapper.readValue(message.body, ChatMessageDto::class.java)

            logger.debug(
                "Redis 메시지 수신: chatRoomId={}, senderId={}, messageId={}",
                messageDto.chatRoomId,
                messageDto.senderId,
                messageDto.id
            )

            // WebSocket STOMP로 브로드캐스트
            // 구독 경로: /topic/chat/{chatRoomId}
            messagingTemplate.convertAndSend(
                "/topic/chat/${messageDto.chatRoomId}",
                messageDto
            )

            logger.debug(
                "WebSocket 브로드캐스트 완료: chatRoomId={}, messageId={}",
                messageDto.chatRoomId,
                messageDto.id
            )

        } catch (e: Exception) {
            logger.error("Redis 메시지 처리 실패: error={}", e.message, e)
        }
    }
}
