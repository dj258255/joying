package com.joying.chat.config;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.joying.chat.service.ChatRoomPermissionCache;
import com.joying.common.config.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

/**
 * 웹소켓 연결에 붙는 인증과 인가.
 *
 * <p>연결을 맺을 때 쿠키에서 토큰을 꺼내 확인한다. REST와 같은 방식이라 브라우저가
 * 따로 무엇을 더 붙이지 않아도 된다.
 *
 * <p>두 가지를 뒤늦게 붙였다.
 *
 * <ul>
 *   <li>처리가 끝나면 인증을 비운다. 인바운드 채널은 스레드 풀이라, 심어 두고
 *       비우지 않으면 그 스레드를 다시 쓰는 다음 메시지가 남의 인증을 본다.
 *   <li>구독할 때도 확인한다. 예전에는 연결만 봤고, 그래서 인증만 된 아무나
 *       남의 방 타이핑과 읽음을 구독해 관찰할 수 있었다.
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

	private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

	private static final String COOKIE_HEADER = "cookie";
	private static final String ACCESS_TOKEN_COOKIE_NAME = "access_token";

	/** {@code /topic/chat/{roomId}/...} 에서 방 번호를 꺼낸다 */
	private static final Pattern ROOM_DESTINATION = Pattern.compile("^/topic/chat/(\\d+)(/.*)?$");

	private final JwtTokenProvider jwtTokenProvider;
	private final ChatRoomPermissionCache permissionCache;

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor =
			MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null) {
			return message;
		}

		if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
			return canSubscribe(accessor) ? message : null;
		}

		// 연결을 맺을 때만 인증한다
		if (StompCommand.CONNECT.equals(accessor.getCommand())) {
			try {
				String token = extractTokenFromCookie(accessor);

				if (token != null && jwtTokenProvider.validateToken(token)) {
					Long memberId = jwtTokenProvider.getMemberId(token);

					UsernamePasswordAuthenticationToken authentication =
						new UsernamePasswordAuthenticationToken(
							String.valueOf(memberId), null, List.of());

					SecurityContextHolder.getContext().setAuthentication(authentication);

					// 연결 세션에도 남긴다. 끊길 때 누가 나갔는지 알아야 한다.
					accessor.setUser(authentication);

					log.info("WebSocket 쿠키 인증 성공: memberId={}", memberId);
				} else {
					log.warn("WebSocket 인증 실패: 유효하지 않은 토큰");
				}
			} catch (Exception e) {
				log.warn("WebSocket 인증 처리 중 오류 발생: {}", e.getMessage());
			}
		}

		return message;
	}

	/**
	 * 처리가 끝나면 인증을 비운다.
	 *
	 * <p>이 채널은 스레드 풀이다. 비우지 않으면 심어 둔 인증이 스레드에 남고, 그
	 * 스레드를 다시 쓰는 다음 메시지가 남의 인증을 본다. 눈으로는 안 보이고 부하가
	 * 있어야 드러난다.
	 */
	@Override
	public void afterSendCompletion(Message<?> message, MessageChannel channel,
									boolean sent, Exception ex) {
		SecurityContextHolder.clearContext();
	}

	/**
	 * 이 방을 구독할 수 있는 사람인지.
	 *
	 * <p>방과 상관없는 목적지는 그대로 통과시킨다. 개인 큐는 목적지에 이미 사용자가
	 * 들어 있어 남의 것을 구독할 수 없다.
	 */
	private boolean canSubscribe(StompHeaderAccessor accessor) {
		String destination = accessor.getDestination();
		if (destination == null) {
			return true;
		}

		Matcher matcher = ROOM_DESTINATION.matcher(destination);
		if (!matcher.matches()) {
			return true;
		}

		Principal principal = accessor.getUser();
		if (principal == null) {
			Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
			if (authentication == null) {
				log.warn("인증 없이 구독 시도: destination={}", destination);
				return false;
			}
			principal = authentication;
		}

		long chatRoomId = Long.parseLong(matcher.group(1));
		long memberId = Long.parseLong(principal.getName());

		boolean allowed = permissionCache.hasPermission(chatRoomId, memberId);
		if (!allowed) {
			log.warn("권한 없는 구독 차단: destination={}, memberId={}", destination, memberId);
		}
		return allowed;
	}

	/**
	 * 쿠키 헤더에서 토큰을 꺼낸다.
	 *
	 * <p>{@code access_token=xxx; other=yyy} 모양에서 앞엣것만 가져온다.
	 */
	private String extractTokenFromCookie(StompHeaderAccessor accessor) {
		List<String> cookies = accessor.getNativeHeader(COOKIE_HEADER);
		if (cookies == null || cookies.isEmpty()) {
			return null;
		}

		String prefix = ACCESS_TOKEN_COOKIE_NAME + "=";
		for (String part : cookies.get(0).split(";")) {
			String trimmed = part.trim();
			if (trimmed.startsWith(prefix)) {
				return trimmed.substring(prefix.length());
			}
		}
		return null;
	}
}
