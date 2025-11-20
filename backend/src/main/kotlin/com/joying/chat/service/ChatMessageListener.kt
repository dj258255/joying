package com.joying.chat.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.joying.chat.dto.ChatMessageResponse
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

/**
 * Redis Pub/Sub 메시지 리스너
 *
 * Redis에서 발행된 채팅 메시지를 수신하여 WebSocket으로 전송
 * - 모든 서버 인스턴스가 독립적으로 메시지 수신
 * - receiverId 기반 전송으로 DB 조회 없음
 * - 서버 확장 가능 (Redis 세션 공유)
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
     * receiverId 기반 전송으로 DB 조회 없음
     * - ChatService에서 receiverId를 미리 계산해서 전송
     * - senderId와 receiverId로 바로 WebSocket 전송
     * - 성능 개선: 메시지당 DB 쿼리 1건 제거 (초당 수백~수천 쿼리 절감)
     *
     * @param message Redis 메시지
     * @param pattern 구독 패턴 (채널 이름)
     */
    override fun onMessage(message: Message, pattern: ByteArray?) {
        try {
            val messageDto = objectMapper.readValue(message.body, ChatMessageResponse::class.java)

            logger.debug(
                "Redis 메시지 수신: chatRoomId={}, senderId={}, receiverId={}, messageId={}",
                messageDto.chatRoomId,
                messageDto.senderId,
                messageDto.receiverId,
                messageDto.id
            )

            // senderId와 receiverId로 직접 전송 (DB 조회 없음)
            var sentCount = 0

            try {
                messagingTemplate.convertAndSendToUser(
                    messageDto.senderId.toString(),
                    "/queue/chat/${messageDto.chatRoomId}",
                    messageDto
                )
                sentCount++
            } catch (e: Exception) {
                logger.warn("sender 메시지 전송 실패: senderId={}, error={}", messageDto.senderId, e.message)
            }

            try {
                messagingTemplate.convertAndSendToUser(
                    messageDto.receiverId.toString(),
                    "/queue/chat/${messageDto.chatRoomId}",
                    messageDto
                )
                sentCount++
            } catch (e: Exception) {
                logger.warn("receiver 메시지 전송 실패: receiverId={}, error={}", messageDto.receiverId, e.message)
            }

            logger.debug(
                "WebSocket 전송 완료: chatRoomId={}, messageId={}, 전송 성공 {}/2",
                messageDto.chatRoomId,
                messageDto.id,
                sentCount
            )

        } catch (e: Exception) {
            logger.error("Redis 메시지 처리 실패: error={}", e.message, e)
        }
    }
}
