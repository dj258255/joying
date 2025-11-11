package com.joying.chat.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.joying.chat.dto.ChatMessageResponse
import com.joying.chat.repository.ChatRoomRepository
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

/**
 * Redis Pub/Sub 메시지 리스너
 *
 * Redis에서 발행된 채팅 메시지를 수신하여 WebSocket으로 전송
 * - 모든 서버 인스턴스가 독립적으로 메시지 수신
 * - Redis에서 세션 정보 조회 (서버 확장 대비)
 * - 각 서버가 자신에게 연결된 클라이언트에게만 전송
 */
@Component
class ChatMessageListener(
    private val messagingTemplate: SimpMessagingTemplate,
    private val objectMapper: ObjectMapper,
    private val chatRoomRepository: ChatRoomRepository,
    private val redis: RedisTemplate<String, String>
) : MessageListener {

    private val logger = LoggerFactory.getLogger(ChatMessageListener::class.java)

    companion object {
        private const val SESSION_KEY_PREFIX = "websocket:session:member:"
    }

    /**
     * Redis에서 메시지 수신 시 호출
     *
     * 기존 (SimpleBroker):
     * - messagingTemplate.convertAndSend("/topic/chat/{chatRoomId}")
     * - SimpleBroker가 구독자 찾아서 전송
     * - 문제: 서버 메모리에만 구독 정보 저장 (서버 확장 불가)
     *
     * 변경 (Redis 세션 관리):
     * - Redis에서 채팅방 참여자의 세션 ID 조회
     * - 각 세션에 직접 메시지 전송
     * - 장점: 서버 확장 가능 (Redis에 세션 정보 공유)
     *
     * @param message Redis 메시지
     * @param pattern 구독 패턴 (채널 이름)
     */
    override fun onMessage(message: Message, pattern: ByteArray?) {
        try {
            // JSON 바이트 배열 → ChatMessageResponse
            val messageDto = objectMapper.readValue(message.body, ChatMessageResponse::class.java)

            logger.debug(
                "Redis 메시지 수신: chatRoomId={}, senderId={}, messageId={}",
                messageDto.chatRoomId,
                messageDto.senderId,
                messageDto.id
            )

            // 1. 채팅방 정보 조회 (구매자/판매자 ID 획득)
            val chatRoom = chatRoomRepository.findById(messageDto.chatRoomId).orElse(null)
            if (chatRoom == null) {
                logger.warn("채팅방 없음: chatRoomId={}", messageDto.chatRoomId)
                return
            }

            // 2. 구매자/판매자의 memberId 가져오기
            val buyerId = chatRoom.buyer.getMemberId().toString()
            val sellerId = chatRoom.seller.getMemberId().toString()

            // 3. memberId를 principal name으로 사용하여 메시지 전송
            // Spring STOMP는 convertAndSendToUser의 첫 인자를 principal name으로 취급
            // WebSocketAuthInterceptor에서 principal name을 memberId로 설정했으므로,
            // 해당 memberId를 가진 모든 세션에 메시지가 전송됨
            var sentCount = 0

            try {
                // buyer에게 전송
                messagingTemplate.convertAndSendToUser(
                    buyerId,
                    "/queue/chat/${messageDto.chatRoomId}",
                    messageDto
                )
                sentCount++
                logger.debug("buyer에게 메시지 전송: buyerId={}, chatRoomId={}", buyerId, messageDto.chatRoomId)
            } catch (e: Exception) {
                logger.warn("buyer 메시지 전송 실패: buyerId={}, error={}", buyerId, e.message)
            }

            try {
                // seller에게 전송
                messagingTemplate.convertAndSendToUser(
                    sellerId,
                    "/queue/chat/${messageDto.chatRoomId}",
                    messageDto
                )
                sentCount++
                logger.debug("seller에게 메시지 전송: sellerId={}, chatRoomId={}", sellerId, messageDto.chatRoomId)
            } catch (e: Exception) {
                logger.warn("seller 메시지 전송 실패: sellerId={}, error={}", sellerId, e.message)
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
