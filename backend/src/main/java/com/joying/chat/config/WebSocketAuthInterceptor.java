package com.joying.chat.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.joying.common.config.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

/**
 * 웹소켓 연결에 붙는 인증.
 *
 * <p>연결을 맺을 때 쿠키에서 토큰을 꺼내 확인한다. REST와 같은 방식이라 브라우저가
 * 따로 무엇을 더 붙이지 않아도 된다.
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

	private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

	private static final String COOKIE_HEADER = "cookie";
	private static final String ACCESS_TOKEN_COOKIE_NAME = "access_token";

	private final JwtTokenProvider jwtTokenProvider;

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor =
			MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null) {
			return message;
		}

		// 연결을 맺을 때만 확인한다
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
