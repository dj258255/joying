package com.joying.chat.service

import com.joying.chat.config.RedisStreamConfig
import com.joying.chat.dto.ChatMessageDto
import kotlinx.coroutines.reactor.awaitSingle
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.stream.ObjectRecord
import org.springframework.data.redis.connection.stream.StreamRecords
import org.springframework.data.redis.core.ReactiveRedisTemplate
import org.springframework.stereotype.Service

/**
 * Redis Stream Publisher
 *
 * 채팅 메시지를 Redis Stream에 발행
 * - XADD 명령어로 메시지 발행
 * - 자동으로 증가하는 ID 부여 (순서 보장의 핵심!)
 * - 코루틴 suspend 함수로 비동기 처리
 */
@Service
class RedisStreamPublisher(
    private val chatMessageRedisTemplate: ReactiveRedisTemplate<String, ChatMessageDto>
) {
    private val logger = LoggerFactory.getLogger(RedisStreamPublisher::class.java)

    /**
     * 채팅 메시지를 Redis Stream에 발행
     *
     * @param message 발행할 메시지
     * @return Stream ID (예: "1609459200000-0")
     */
    suspend fun publish(message: ChatMessageDto): String {
        return try {
            // ObjectRecord 생성 (Stream에 저장할 데이터)
            val record: ObjectRecord<String, ChatMessageDto> = StreamRecords
                .newRecord()
                .`in`(RedisStreamConfig.CHAT_STREAM_KEY)  // Stream 키
                .ofObject(message)  // 메시지 객체

            // Redis Stream에 발행 (XADD)
            // 반환값: RecordId (예: "1609459200000-0")
            val recordId = chatMessageRedisTemplate
                .opsForStream<String, ChatMessageDto>()
                .add(record)
                .awaitSingle()  // Mono<RecordId> → suspend (코루틴 변환)

            val streamId = recordId.value

            logger.debug(
                "Redis Stream 발행 성공: streamId={}, chatRoomId={}, senderId={}",
                streamId,
                message.chatRoomId,
                message.senderId
            )

            streamId
        } catch (e: Exception) {
            logger.error(
                "Redis Stream 발행 실패: chatRoomId={}, senderId={}, error={}",
                message.chatRoomId,
                message.senderId,
                e.message,
                e
            )
            throw RuntimeException("메시지 발행 실패", e)
        }
    }
}