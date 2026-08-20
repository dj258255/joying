package com.joying.chat.broadcast;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * 서버를 넘어야 하는 전달을 내보내는 자리.
 *
 * <p>예전에는 각자 메시징 템플릿을 직접 불렀다. 그러면 보낸 서버 안에서만 돌고, 새
 * 목적지가 생길 때마다 서버를 넘기는 것을 또 잊는다. 실제로 채팅 메시지 본문만 Redis를
 * 타고 타이핑과 읽음, 접속 상태, 안읽음 배지는 전부 빠져 있었다.
 *
 * <p>나가는 자리를 하나로 모아 두면, 새 목적지를 더하는 사람이 무엇을 해야 하는지
 * 고르지 않아도 된다.
 */
@Component
@RequiredArgsConstructor
public class ChatBroadcaster {

	private static final Logger log = LoggerFactory.getLogger(ChatBroadcaster.class);

	private final StringRedisTemplate stringRedisTemplate;
	private final ObjectMapper objectMapper;

	/**
	 * 한 회원에게 보낸다. 그 회원이 어느 서버에 붙어 있든 닿는다.
	 */
	public void toUser(Long userId, String destination, Object payload) {
		publish(new ChatBroadcast(ChatBroadcast.Kind.USER, userId, destination, toJson(payload)));
	}

	/**
	 * 목적지를 구독한 모두에게 보낸다.
	 */
	public void toTopic(String destination, Object payload) {
		publish(new ChatBroadcast(ChatBroadcast.Kind.TOPIC, null, destination, toJson(payload)));
	}

	private void publish(ChatBroadcast broadcast) {
		try {
			stringRedisTemplate.convertAndSend(
				ChatBroadcast.CHANNEL, objectMapper.writeValueAsString(broadcast));
		} catch (Exception e) {
			// 전달에 실패해도 그것 때문에 부르는 쪽의 작업을 되돌리지 않는다.
			// 방 목록이나 타이핑 표시가 한 번 빠지는 것과, 저장된 것을 되돌리는 것 중
			// 뒤엣것이 훨씬 비싸다.
			log.warn("전달 발행 실패: kind={}, destination={}, error={}",
				broadcast.getKind(), broadcast.getDestination(), e.getMessage());
		}
	}

	private String toJson(Object payload) {
		try {
			return objectMapper.writeValueAsString(payload);
		} catch (Exception e) {
			throw new IllegalArgumentException("전달 내용을 JSON으로 만들 수 없다", e);
		}
	}
}
