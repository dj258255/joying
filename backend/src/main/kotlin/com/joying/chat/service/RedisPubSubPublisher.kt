package com.joying.chat.service

import com.joying.chat.config.RedisPubSubConfig
import com.joying.chat.dto.ChatMessageDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service

/**
 * Redis Pub/Sub Publisher
 *
 * 채팅 메시지를 Redis Pub/Sub로 발행
 * - Redis Stream 대신 간단한 Pub/Sub 사용
 * - 코루틴 suspend 함수로 비동기 처리
 * - Scale-out 가능 (여러 서버 인스턴스)
 */
@Service
class RedisPubSubPublisher(
    private val chatMessageRedisTemplate: RedisTemplate<String, ChatMessageDto>
) {
    private val logger = LoggerFactory.getLogger(RedisPubSubPublisher::class.java)

    /**
     * 채팅 메시지를 Redis Pub/Sub로 발행
     *
     * @param message 발행할 메시지
     */
    suspend fun publish(message: ChatMessageDto) {
        withContext(Dispatchers.IO) {
            try {
                // Redis Pub/Sub로 발행 (PUBLISH 명령)
                chatMessageRedisTemplate.convertAndSend(
                    RedisPubSubConfig.CHAT_MESSAGE_CHANNEL,
                    message
                )

                logger.debug(
                    "Redis Pub/Sub 발행 성공: chatRoomId={}, senderId={}, messageId={}",
                    message.chatRoomId,
                    message.senderId,
                    message.id
                )
            } catch (e: Exception) {
                logger.error(
                    "Redis Pub/Sub 발행 실패: chatRoomId={}, senderId={}, error={}",
                    message.chatRoomId,
                    message.senderId,
                    e.message,
                    e
                )
                throw RuntimeException("메시지 발행 실패", e)
            }
        }
    }
}