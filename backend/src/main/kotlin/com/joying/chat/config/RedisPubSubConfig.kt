package com.joying.chat.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.service.ChatMessageListener
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.listener.ChannelTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.StringRedisSerializer

/**
 * Redis Pub/Sub 설정
 *
 * 실시간 채팅 메시지 전달을 위한 Redis Pub/Sub 설정
 * - Redis Stream 대신 간단한 Pub/Sub 사용
 * - 순서 보장은 MongoDB의 createdAt으로 처리
 * - Scale-out 가능 (여러 서버 인스턴스)
 */
@Configuration
class RedisPubSubConfig {

    companion object {
        /**
         * 채팅 메시지 채널
         * 모든 채팅 메시지는 이 채널로 발행됨
         */
        const val CHAT_MESSAGE_CHANNEL = "chat:messages"
    }

    /**
     * RedisTemplate<String, ChatMessageDto> 설정
     *
     * Redis Pub/Sub로 ChatMessageDto를 발행하기 위한 템플릿
     * - Key: String (채널 이름)
     * - Value: ChatMessageDto (JSON 직렬화)
     */
    @Bean
    fun chatMessageRedisTemplate(
        connectionFactory: RedisConnectionFactory,
        objectMapper: ObjectMapper
    ): RedisTemplate<String, ChatMessageDto> {
        val template = RedisTemplate<String, ChatMessageDto>()
        template.connectionFactory = connectionFactory

        // Key Serializer
        val stringSerializer = StringRedisSerializer()
        template.keySerializer = stringSerializer
        template.hashKeySerializer = stringSerializer

        // Value Serializer (JSON)
        val jsonSerializer = Jackson2JsonRedisSerializer(objectMapper, ChatMessageDto::class.java)
        template.valueSerializer = jsonSerializer
        template.hashValueSerializer = jsonSerializer

        return template
    }

    /**
     * Redis Message Listener Container 설정
     *
     * Redis Pub/Sub 메시지를 구독하는 컨테이너
     * - 백그라운드 스레드로 메시지 수신
     * - ChatMessageListener에게 메시지 전달
     */
    @Bean
    fun redisMessageListenerContainer(
        connectionFactory: RedisConnectionFactory,
        chatMessageListener: ChatMessageListener
    ): RedisMessageListenerContainer {
        val container = RedisMessageListenerContainer()
        container.setConnectionFactory(connectionFactory)

        // chat:messages 채널 구독
        container.addMessageListener(chatMessageListener, ChannelTopic(CHAT_MESSAGE_CHANNEL))

        return container
    }

    /**
     * 채팅 메시지 채널 Topic Bean
     */
    @Bean
    fun chatMessageTopic(): ChannelTopic {
        return ChannelTopic(CHAT_MESSAGE_CHANNEL)
    }
}
