package com.joying.chat.broadcast;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * 다른 서버가 보낸 것을 받아 자기에게 붙은 세션으로 내보낸다.
 *
 * <p>페이로드를 문자열 그대로 넘기지 않고 객체로 풀어서 넘긴다. 문자열로 넘기면
 * 클라이언트가 JSON 안에 JSON이 든 것을 받아 한 번 더 풀어야 한다.
 *
 * <p>자기가 보낸 것도 다시 받는다. Redis Pub/Sub은 발행자에게도 되돌려 주기 때문이다.
 * 그래서 보내는 쪽은 로컬 브로커를 직접 부르지 않는다. 부르면 자기 서버에 붙은
 * 사람에게 두 번 간다.
 */
@Component
@RequiredArgsConstructor
public class ChatBroadcastListener implements MessageListener {

	private static final Logger log = LoggerFactory.getLogger(ChatBroadcastListener.class);

	private final SimpMessagingTemplate messagingTemplate;
	private final ObjectMapper objectMapper;

	@Override
	public void onMessage(Message message, byte[] pattern) {
		try {
			ChatBroadcast broadcast = objectMapper.readValue(message.getBody(), ChatBroadcast.class);

			if (broadcast.getKind() == ChatBroadcast.Kind.USER) {
				Long userId = broadcast.getUserId();
				if (userId == null) {
					log.warn("받을 회원이 없다: destination={}", broadcast.getDestination());
					return;
				}
				messagingTemplate.convertAndSendToUser(
					String.valueOf(userId),
					broadcast.getDestination(),
					objectMapper.readTree(broadcast.getPayloadJson()));
			} else {
				messagingTemplate.convertAndSend(
					broadcast.getDestination(),
					objectMapper.readTree(broadcast.getPayloadJson()));
			}
		} catch (Exception e) {
			// 한 건이 깨져도 나머지 전달은 계속 받아야 한다.
			log.warn("전달 처리 실패: error={}", e.getMessage());
		}
	}
}
