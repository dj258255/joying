package com.joying.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.chat.broadcast.ChatBroadcast;
import com.joying.chat.broadcast.ChatBroadcastListener;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.service.ChatMessageListener;

/**
 * Redis Pub/Sub 설정.
 *
 * <p>메시지를 여러 서버에 나눠 전달하는 데 쓴다. 서버가 늘어도 자기에게 붙어 있지
 * 않은 상대에게 닿아야 하기 때문이다.
 */
@Configuration
public class RedisPubSubConfig {

	/** 채팅 메시지 본문이 지나는 채널 */
	public static final String CHAT_MESSAGE_CHANNEL = "chat:messages";

	@Bean
	public RedisTemplate<String, ChatMessageResponse> chatMessageRedisTemplate(
		RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {

		RedisTemplate<String, ChatMessageResponse> template = new RedisTemplate<>();
		template.setConnectionFactory(connectionFactory);

		StringRedisSerializer stringSerializer = new StringRedisSerializer();
		template.setKeySerializer(stringSerializer);
		template.setHashKeySerializer(stringSerializer);

		Jackson2JsonRedisSerializer<ChatMessageResponse> jsonSerializer =
			new Jackson2JsonRedisSerializer<>(objectMapper, ChatMessageResponse.class);
		template.setValueSerializer(jsonSerializer);
		template.setHashValueSerializer(jsonSerializer);

		return template;
	}

	/**
	 * Redis에서 온 것을 받는 컨테이너.
	 *
	 * <p>백그라운드 스레드로 받아 각 리스너에 넘긴다.
	 */
	@Bean
	public RedisMessageListenerContainer redisMessageListenerContainer(
		RedisConnectionFactory connectionFactory,
		ChatMessageListener chatMessageListener,
		ChatBroadcastListener chatBroadcastListener) {

		RedisMessageListenerContainer container = new RedisMessageListenerContainer();
		container.setConnectionFactory(connectionFactory);

		// 메시지 본문
		container.addMessageListener(chatMessageListener, new ChannelTopic(CHAT_MESSAGE_CHANNEL));

		// 타이핑, 읽음, 접속 상태, 방 목록 갱신처럼 서버를 넘어야 하는 나머지
		container.addMessageListener(chatBroadcastListener, new ChannelTopic(ChatBroadcast.CHANNEL));

		return container;
	}

	@Bean
	public ChannelTopic chatMessageTopic() {
		return new ChannelTopic(CHAT_MESSAGE_CHANNEL);
	}
}
