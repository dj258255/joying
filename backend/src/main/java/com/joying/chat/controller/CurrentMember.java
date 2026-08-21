package com.joying.chat.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 지금 요청을 보낸 사람이 누구인지.
 *
 * <p>인증 필터가 쿠키에서 토큰을 꺼내 남겨 둔 것을 읽는다. 컨트롤러마다 같은 코드를
 * 복사해 두고 있어서 한 곳으로 모았다. 복사돼 있으면 인증을 다루는 방식이 바뀔 때
 * 한 군데를 빠뜨린다.
 */
public final class CurrentMember {

	private CurrentMember() {
	}

	public static Long id() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null) {
			throw new IllegalStateException("인증 정보가 없습니다");
		}
		return Long.valueOf(authentication.getName());
	}
}
