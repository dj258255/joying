package com.joying.chat.config;

import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
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

		// 받은 것을 넘겨주는 자리를 스레드 하나로 묶는다.
		//
		// 지정하지 않으면 기본값이 메시지마다 새 스레드를 만드는 방식이다. 200건을
		// 보내면 서로 다른 스레드 200개가 생긴다. 몰릴수록 스레드가 늘어나고, 순서도
		// 그때그때 달라진다.
		//
		// 여기서는 넘겨주기만 하고 실제 일은 방 단위 실행기가 한다. 그래서 스레드
		// 하나로 충분하고, Redis 가 보낸 순서가 그대로 유지된다.
		ThreadPoolTaskExecutor dispatcher = new ThreadPoolTaskExecutor();
		dispatcher.setCorePoolSize(1);
		dispatcher.setMaxPoolSize(1);
		dispatcher.setQueueCapacity(1000);
		dispatcher.setThreadNamePrefix("chat-redis-dispatch-");
		// 큐가 차면 부른 스레드가 직접 처리한다. 버리면 메시지가 화면에 닿지 않는다
		dispatcher.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
		dispatcher.initialize();
		container.setTaskExecutor(dispatcher);

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
