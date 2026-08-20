package com.joying.chat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.joying.chat.config.RedisPubSubConfig;
import com.joying.chat.dto.ChatMessageResponse;

import lombok.RequiredArgsConstructor;

/**
 * 채팅 메시지를 Redis로 내보낸다.
 *
 * <p>서버가 여러 대일 때 자기에게 붙어 있지 않은 상대에게도 닿아야 하므로, 로컬
 * 브로커로 바로 보내지 않고 여기를 거친다.
 */
@Service
@RequiredArgsConstructor
public class RedisPubSubPublisher {

	private static final Logger log = LoggerFactory.getLogger(RedisPubSubPublisher.class);

	private final RedisTemplate<String, ChatMessageResponse> chatMessageRedisTemplate;

	/**
	 * 발행에 실패하면 예외를 올린다.
	 *
	 * <p>메시지는 저장까지 끝난 뒤에 발행되므로, 여기서 실패하면 저장은 됐는데 상대가
	 * 못 받은 상태가 된다. 부르는 쪽이 그것을 알아야 한다.
	 */
	public void publish(ChatMessageResponse message) {
		try {
			chatMessageRedisTemplate.convertAndSend(
				RedisPubSubConfig.CHAT_MESSAGE_CHANNEL, message);

			log.debug("Redis Pub/Sub 발행 성공: chatRoomId={}, senderId={}, messageId={}",
				message.getChatRoomId(), message.getSenderId(), message.getId());
		} catch (Exception e) {
			log.error("Redis Pub/Sub 발행 실패: chatRoomId={}, senderId={}, error={}",
				message.getChatRoomId(), message.getSenderId(), e.getMessage(), e);
			throw new RuntimeException("메시지 발행 실패", e);
		}
	}
}
