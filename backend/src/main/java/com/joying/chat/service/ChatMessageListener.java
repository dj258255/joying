package com.joying.chat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.chat.config.KeyOrderedExecutor;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.metrics.ChatMetrics;

import lombok.RequiredArgsConstructor;


/**
 * Redis로 들어온 채팅 메시지를 자기에게 붙은 세션으로 내보낸다.
 *
 * <p>서버마다 이 리스너가 하나씩 돌고, 각자 자기에게 붙어 있는 사람에게만 보낸다.
 * 누구에게 보낼지는 메시지에 실려 온 보낸 사람과 받는 사람으로 정한다. 방을 다시
 * 조회하지 않으므로 메시지 한 건마다 쿼리가 나가지 않는다.
 *
 * <p>여기가 도는 스레드는 하나다. 그 스레드에서 오래 붙잡고 있으면 뒤에 온 메시지가
 * 밀리므로, 받아서 방 단위 실행기에 넘기고 바로 빠진다. 방 안에서는 순서대로, 방끼리는
 * 동시에 나간다.
 */
@Component
@RequiredArgsConstructor
public class ChatMessageListener implements MessageListener {

	private static final Logger log = LoggerFactory.getLogger(ChatMessageListener.class);

	private final SimpMessagingTemplate messagingTemplate;
	private final ObjectMapper objectMapper;

	/**
	 * 전달에 쓸 실행기.
	 *
	 * <p>같은 타입의 빈이 둘이라 이름으로 골라야 한다. 이 애너테이션이 생성자
	 * 파라미터까지 따라가도록 {@code lombok.config} 에 적어 두었다.
	 */
	@Qualifier("chatDeliveryExecutor")
	private final KeyOrderedExecutor deliveryExecutor;

	private final ChatMetrics chatMetrics;

	@Override
	public void onMessage(Message message, byte[] pattern) {
		try {
			ChatMessageResponse dto =
				objectMapper.readValue(message.getBody(), ChatMessageResponse.class);

			deliveryExecutor.execute(dto.getChatRoomId(), () -> deliver(dto));
		} catch (Exception e) {
			// 한 건이 깨져도 나머지는 계속 받아야 한다.
			log.error("Redis 메시지 처리 실패: error={}", e.getMessage(), e);
		}
	}

	/**
	 * 양쪽 화면으로 내보낸다.
	 *
	 * <p>방 단위 실행기에서 돈다. 여기서 던진 예외는 아무도 받지 않으므로 직접 잡는다.
	 */
	private void deliver(ChatMessageResponse dto) {
		try {
			String destination = "/queue/chat/" + dto.getChatRoomId();
			int sentCount = 0;

			// 보낸 사람에게도 보낸다. 다른 기기에서 열어 둔 화면이 있을 수 있다.
			sentCount += sendTo(dto.getSenderId(), destination, dto, "sender");
			sentCount += sendTo(dto.getReceiverId(), destination, dto, "receiver");

			// 만들어진 때부터 화면으로 나갈 때까지. 사용자가 실제로 겪는 값이다
			chatMetrics.recordDelivery(dto.getCreatedAt());

			log.debug("WebSocket 전송 완료: chatRoomId={}, messageId={}, 전송 성공 {}/2",
				dto.getChatRoomId(), dto.getId(), sentCount);
		} catch (Exception e) {
			log.error("WebSocket 전송 실패: chatRoomId={}, messageId={}, error={}",
				dto.getChatRoomId(), dto.getId(), e.getMessage(), e);
		}
	}

	/**
	 * 한쪽이 실패해도 다른 쪽은 보낸다.
	 *
	 * @return 보낸 횟수. 실패하면 0
	 */
	private int sendTo(Long userId, String destination, ChatMessageResponse dto, String who) {
		try {
			messagingTemplate.convertAndSendToUser(String.valueOf(userId), destination, dto);
			return 1;
		} catch (Exception e) {
			log.warn("{} 메시지 전송 실패: userId={}, error={}", who, userId, e.getMessage());
			return 0;
		}
	}
}
