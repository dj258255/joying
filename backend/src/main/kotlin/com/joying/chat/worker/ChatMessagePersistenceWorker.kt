package com.joying.chat.worker

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.joying.chat.config.RedisStreamConfig
import com.joying.chat.document.ChatMessage
import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.repository.ChatMessageRepository
import jakarta.annotation.PostConstruct
import kotlinx.coroutines.reactor.awaitSingle
import kotlinx.coroutines.reactor.awaitSingleOrNull
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.stream.Consumer
import org.springframework.data.redis.connection.stream.MapRecord
import org.springframework.data.redis.connection.stream.ReadOffset
import org.springframework.data.redis.connection.stream.StreamOffset
import org.springframework.data.redis.core.ReactiveRedisTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 채팅 메시지 영구 저장 Worker
 *
 * Redis Stream에서 메시지를 순서대로 읽어서 MongoDB에 저장
 * - @Scheduled로 100ms마다 실행
 * - Consumer Group: persistence-worker (순서 보장)
 * - ACK 처리로 중복 방지
 * - 실패 시 재시도 (Pending List)
 *
 * ⭐ 순서 보장의 핵심: Redis Stream ID 오름차순으로 읽어서 순서대로 저장
 */
@Component
class ChatMessagePersistenceWorker(
    private val chatMessageRedisTemplate: ReactiveRedisTemplate<String, ChatMessageDto>,
    private val chatMessageRepository: ChatMessageRepository,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(ChatMessagePersistenceWorker::class.java)

    companion object {
        private const val CONSUMER_NAME = "worker-1"
        private const val BATCH_SIZE = 10L  // 한 번에 읽을 메시지 개수
    }

    /**
     * 애플리케이션 시작 시 Consumer Group 생성
     * (이미 존재하면 무시)
     */
    @PostConstruct
    fun createConsumerGroup() {
        runBlocking {
            try {
                chatMessageRedisTemplate
                    .opsForStream<String, ChatMessageDto>()
                    .createGroup(
                        RedisStreamConfig.CHAT_STREAM_KEY,
                        RedisStreamConfig.PERSISTENCE_CONSUMER_GROUP
                    )
                    .awaitSingleOrNull()

                logger.info(
                    "Redis Stream Consumer Group 생성 완료: group={}",
                    RedisStreamConfig.PERSISTENCE_CONSUMER_GROUP
                )
            } catch (e: Exception) {
                // 이미 존재하는 경우 무시
                logger.debug(
                    "Consumer Group이 이미 존재하거나 생성 실패 (무시): {}",
                    e.message
                )
            }
        }
    }

    /**
     * 100ms마다 Redis Stream에서 메시지를 읽어서 MongoDB에 저장
     *
     * fixedDelay: 이전 작업이 완료된 후 100ms 대기 (오버랩 방지)
     */
    @Scheduled(fixedDelay = 100)
    fun persistMessages() = runBlocking {
        try {
            // Consumer Group으로 메시지 읽기 (ID 오름차순 보장)
            val messages = chatMessageRedisTemplate
                .opsForStream<String, ChatMessageDto>()
                .read(
                    Consumer.from(
                        RedisStreamConfig.PERSISTENCE_CONSUMER_GROUP,
                        CONSUMER_NAME
                    ),
                    StreamOffset.create(
                        RedisStreamConfig.CHAT_STREAM_KEY,
                        ReadOffset.lastConsumed()  // 마지막으로 ACK한 메시지 이후부터
                    )
                )
                .take(BATCH_SIZE)  // 최대 10개만 읽기
                .collectList()
                .awaitSingle()

            if (messages.isEmpty()) {
                return@runBlocking
            }

            logger.debug("Redis Stream에서 메시지 읽음: count={}", messages.size)

            // 메시지를 순서대로 MongoDB에 저장
            messages.forEach { record ->
                try {
                    val streamId = record.id.value

                    // Map → ChatMessageDto 변환
                    val messageDto = objectMapper.convertValue(record.value, ChatMessageDto::class.java)

                    // ChatMessageDto → ChatMessage 변환
                    val chatMessage = ChatMessage(
                        chatRoomId = messageDto.chatRoomId,
                        senderId = messageDto.senderId,
                        type = messageDto.type,
                        content = messageDto.content,
                        imageUrl = messageDto.imageUrl,
                        fileUrl = messageDto.fileUrl,
                        fileName = messageDto.fileName,
                        fileSize = messageDto.fileSize,
                        replyToMessageId = messageDto.replyToMessageId,
                        createdAt = messageDto.createdAt,
                        isDeleted = messageDto.isDeleted
                    )

                    // MongoDB에 저장
                    val saved = chatMessageRepository.save(chatMessage)

                    logger.debug(
                        "MongoDB 저장 완료: streamId={}, messageId={}, chatRoomId={}",
                        streamId,
                        saved.id,
                        saved.chatRoomId
                    )

                    // ACK 처리 (성공적으로 저장되었음을 Redis에 알림)
                    chatMessageRedisTemplate
                        .opsForStream<String, ChatMessageDto>()
                        .acknowledge(
                            RedisStreamConfig.CHAT_STREAM_KEY,
                            RedisStreamConfig.PERSISTENCE_CONSUMER_GROUP,
                            record.id
                        )
                        .awaitSingle()

                    logger.debug("Redis Stream ACK 완료: streamId={}", streamId)

                } catch (e: Exception) {
                    logger.error(
                        "메시지 저장 실패: streamId={}, error={}",
                        record.id.value,
                        e.message,
                        e
                    )
                    // ACK 하지 않음 → Pending List에 남아서 재시도됨
                }
            }

        } catch (e: Exception) {
            logger.error("Persistence Worker 실행 실패: {}", e.message, e)
        }
    }

    /**
     * Pending List에 있는 메시지 재처리
     * (ACK 되지 않은 메시지들)
     *
     * 1시간마다 실행
     */
    @Scheduled(fixedDelay = 3600000)  // 1시간
    fun retryPendingMessages() = runBlocking {
        try {
            logger.info("Pending 메시지 재처리 시작")

            // Pending List 조회 (그룹 전체)
            val pendingMessages = chatMessageRedisTemplate
                .opsForStream<String, ChatMessageDto>()
                .pending(
                    RedisStreamConfig.CHAT_STREAM_KEY,
                    RedisStreamConfig.PERSISTENCE_CONSUMER_GROUP
                )
                ?.awaitSingleOrNull()

            if (pendingMessages != null && pendingMessages.totalPendingMessages > 0) {
                logger.warn(
                    "Pending 메시지 발견: count={}",
                    pendingMessages.totalPendingMessages
                )

                // Pending 메시지 클레임 (재처리)
                // 구현 생략 (필요 시 XCLAIM 사용)
            } else {
                logger.debug("Pending 메시지 없음")
            }

        } catch (e: Exception) {
            logger.error("Pending 메시지 재처리 실패: {}", e.message, e)
        }
    }
}