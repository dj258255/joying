package com.joying.chat.config

import com.joying.chat.dto.ChatMessageDto
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory
import org.springframework.data.redis.core.ReactiveRedisTemplate
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer

/**
 * Redis Stream 설정
 *
 * 실시간 메시지 전달 + 순서 보장을 위한 Redis Stream 설정
 * - ReactiveRedisTemplate: 비동기 Redis 작업
 * - Stream Key: chat:stream
 * - Consumer Group: 각 서버 인스턴스마다 별도 생성 (브로드캐스트)
 */
@Configuration
class RedisStreamConfig {

    companion object {
        /**
         * Redis Stream 키
         * 모든 채팅 메시지는 이 Stream으로 발행됨
         */
        const val CHAT_STREAM_KEY = "chat:stream"

        /**
         * Persistence Worker용 Consumer Group
         * MongoDB 저장 전용 (순서대로 읽어서 저장)
         */
        const val PERSISTENCE_CONSUMER_GROUP = "persistence-worker"

        /**
         * Broadcast용 Consumer Group 접두사
         * 각 서버 인스턴스는 고유한 Consumer Group을 가짐
         * 예: broadcast-server-192.168.1.100
         */
        const val BROADCAST_CONSUMER_GROUP_PREFIX = "broadcast-server"
    }

    /**
     * ReactiveRedisTemplate<String, ChatMessageDto> 설정
     *
     * Redis Stream에 ChatMessageDto를 발행/구독하기 위한 템플릿
     * - Key: String (Stream 키)
     * - Value: ChatMessageDto (JSON 직렬화)
     */
    @Bean
    fun chatMessageRedisTemplate(
        connectionFactory: ReactiveRedisConnectionFactory
    ): ReactiveRedisTemplate<String, ChatMessageDto> {
        val keySerializer = StringRedisSerializer()
        val valueSerializer = Jackson2JsonRedisSerializer(ChatMessageDto::class.java)

        val serializationContext = RedisSerializationContext
            .newSerializationContext<String, ChatMessageDto>(keySerializer)
            .value(valueSerializer)
            .hashKey(keySerializer)
            .hashValue(valueSerializer)
            .build()

        return ReactiveRedisTemplate(connectionFactory, serializationContext)
    }
}