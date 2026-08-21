package com.joying.chat.websocket;

import java.security.Principal;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.joying.chat.service.ChatPresenceService;

import lombok.RequiredArgsConstructor;

/**
 * 연결과 해제를 받아 접속 상태를 갱신한다.
 *
 * <p>누가 연결했는지는 {@code WebSocketAuthInterceptor}가 세션에 남겨 둔 것을 읽는다.
 * 여기서 다시 토큰을 확인하지 않는다.
 *
 * <p>세션 목록을 Redis에 두는 이유는 한 사람이 여러 기기에서 붙을 수 있고, 서버가
 * 여러 대일 때 다른 서버도 그것을 알아야 하기 때문이다.
 */
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

	private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);

	private static final String SESSION_KEY_PREFIX = "websocket:session:member:";
	private static final long SESSION_TTL_HOURS = 2L;

	private final ChatPresenceService chatPresenceService;
	private final RedisTemplate<String, String> redis;

	@EventListener
	public void handleSessionConnected(SessionConnectedEvent event) {
		try {
			StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
			Long memberId = extractMemberId(event.getMessage());
			String sessionId = requireSessionId(accessor);

			chatPresenceService.setOnline(memberId);

			String key = SESSION_KEY_PREFIX + memberId;
			redis.opsForSet().add(key, sessionId);
			redis.expire(key, SESSION_TTL_HOURS, TimeUnit.HOURS);

			log.info("WebSocket 연결 완료: memberId={}, sessionId={}", memberId, sessionId);
		} catch (Exception e) {
			// 토큰이 없거나 유효하지 않은 연결이 들어올 수 있다. 그것 때문에 서버가
			// 흔들릴 이유는 없다.
			log.warn("WebSocket 연결 이벤트 처리 실패: {}", e.getMessage());
		}
	}

	@EventListener
	public void handleSessionDisconnect(SessionDisconnectEvent event) {
		try {
			StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
			Long memberId = extractMemberId(event.getMessage());
			String sessionId = requireSessionId(accessor);

			chatPresenceService.setOffline(memberId);

			redis.opsForSet().remove(SESSION_KEY_PREFIX + memberId, sessionId);

			log.info("WebSocket 연결 해제: memberId={}, sessionId={}", memberId, sessionId);
		} catch (Exception e) {
			log.warn("WebSocket 해제 이벤트 처리 실패: {}", e.getMessage());
		}
	}

	private String requireSessionId(StompHeaderAccessor accessor) {
		String sessionId = accessor.getSessionId();
		if (sessionId == null) {
			throw new IllegalStateException("세션 ID가 없습니다");
		}
		return sessionId;
	}

	/**
	 * 인터셉터가 남겨 둔 사용자 정보에서 회원 번호를 꺼낸다.
	 */
	private Long extractMemberId(Message<byte[]> message) {
		Principal principal = StompHeaderAccessor.wrap(message).getUser();
		if (principal == null) {
			throw new IllegalArgumentException("인증되지 않은 사용자입니다");
		}
		return Long.valueOf(principal.getName());
	}
}
