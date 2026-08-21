package com.joying.chat.websocket;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.config.KeyOrderedExecutor;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.dto.SendMessageRequest;
import com.joying.chat.service.ChatPresenceService;
import com.joying.chat.service.ChatService;

/**
 * 웹소켓으로 들어오는 채팅 요청을 받는다.
 *
 * <p>누가 보냈는지는 연결할 때 인증이 남겨 둔 것을 읽는다. 요청마다 다시 확인하지 않는다.
 */
@Controller
public class ChatWebSocketHandler {

	private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

	private final ChatService chatService;
	private final KeyOrderedExecutor messageExecutor;
	private final ChatBroadcaster chatBroadcaster;
	private final ChatPresenceService chatPresenceService;

	public ChatWebSocketHandler(ChatService chatService,
								@Qualifier("chatMessageExecutor") KeyOrderedExecutor messageExecutor,
								ChatBroadcaster chatBroadcaster,
								ChatPresenceService chatPresenceService) {
		this.chatService = chatService;
		this.messageExecutor = messageExecutor;
		this.chatBroadcaster = chatBroadcaster;
		this.chatPresenceService = chatPresenceService;
	}

	/**
	 * 메시지를 보낸다.
	 *
	 * <p>저장과 발행을 요청 스레드에서 하지 않는다. 보낸 사람은 응답을 기다리지 않고,
	 * 결과는 구독으로 돌아온다.
	 *
	 * <p>넓은 조회 풀이 아니라 방 단위로 묶인 실행기에 던진다. 넓은 풀에 던지면 같은
	 * 방의 메시지가 여러 스레드에 흩어져, 번호는 맞는데 받는 쪽에 닿는 순서가 뒤섞인다.
	 * 부하를 넣고 재 보니 200건 중 176번 뒤로 갔다.
	 */
	@MessageMapping("/chat/{chatRoomId}/send")
	public void sendMessage(@DestinationVariable Long chatRoomId,
							@Payload SendMessageRequest request,
							SimpMessageHeaderAccessor headerAccessor) {
		Long memberId = extractMemberId(headerAccessor);

		log.debug("메시지 전송 요청: chatRoomId={}, memberId={}, type={}",
			chatRoomId, memberId, request.getType());

		messageExecutor.execute(chatRoomId, () -> {
			try {
				ChatMessageResponse message = chatService.sendMessage(chatRoomId, memberId, request);
				log.info("메시지 전송 완료: chatRoomId={}, messageId={}, senderId={}",
					chatRoomId, message.getId(), memberId);
			} catch (Exception e) {
				log.error("메시지 전송 실패: chatRoomId={}, memberId={}, error={}",
					chatRoomId, memberId, e.getMessage(), e);
			}
		});
	}

	@MessageMapping("/chat/{chatRoomId}/typing")
	public void sendTypingIndicator(@DestinationVariable Long chatRoomId,
									SimpMessageHeaderAccessor headerAccessor) {
		Long memberId = extractMemberId(headerAccessor);

		chatBroadcaster.toTopic("/topic/chat/" + chatRoomId + "/typing",
			Map.of("chatRoomId", chatRoomId, "memberId", memberId, "isTyping", true));
	}

	@MessageMapping("/chat/{chatRoomId}/read")
	public void markAsRead(@DestinationVariable Long chatRoomId,
						   SimpMessageHeaderAccessor headerAccessor) {
		Long memberId = extractMemberId(headerAccessor);

		chatService.markAsRead(chatRoomId, memberId);

		chatBroadcaster.toTopic("/topic/chat/" + chatRoomId + "/read",
			Map.of("chatRoomId", chatRoomId, "memberId", memberId,
				"readAt", System.currentTimeMillis()));
	}

	/**
	 * 살아 있다는 신호.
	 *
	 * <p>접속 상태는 시간이 지나면 스스로 사라지므로 주기적으로 다시 알려야 한다.
	 * 방 번호를 같이 보내면 그 방을 보고 있다는 것까지 갱신한다.
	 */
	@MessageMapping("/chat/heartbeat")
	public void heartbeat(@Payload(required = false) Map<String, Object> payload,
						  SimpMessageHeaderAccessor headerAccessor) {
		Long memberId = extractMemberId(headerAccessor);

		chatPresenceService.heartbeat(memberId);

		if (payload == null) {
			return;
		}
		Long chatRoomId = toLong(payload.get("chatRoomId"));
		if (chatRoomId != null) {
			chatPresenceService.refreshChatRoomActivity(memberId, chatRoomId);
		}
	}

	private Long toLong(Object value) {
		if (value instanceof Number number) {
			return number.longValue();
		}
		if (value instanceof String text) {
			try {
				return Long.valueOf(text);
			} catch (NumberFormatException e) {
				return null;
			}
		}
		return null;
	}

	/**
	 * 연결할 때 인증이 남겨 둔 사용자 정보를 읽는다.
	 */
	private Long extractMemberId(SimpMessageHeaderAccessor headerAccessor) {
		Principal principal = headerAccessor.getUser();
		if (principal == null) {
			throw new IllegalArgumentException("인증되지 않은 사용자입니다");
		}
		return Long.valueOf(principal.getName());
	}
}
