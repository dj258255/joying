package com.joying.common.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Optional;

/**
 * Cookie 유틸리티
 *
 * 보안 설정 적용:
 * - Access Token: SameSite=Lax (일반적인 GET 요청 허용)
 * - Refresh Token: SameSite=Strict (완벽한 CSRF 방어)
 */
public class CookieUtil {

	/**
	 * Cookie 생성 (SameSite=Lax)
	 *
	 * Access Token 등 일반적인 요청에 사용
	 * 외부 링크 클릭 시에도 쿠키 전송 (GET 요청만)
	 *
	 * @param name     쿠키 이름
	 * @param value    쿠키 값
	 * @param maxAge   만료 시간 (초)
	 * @return Cookie
	 */
	public static Cookie createCookie(String name, String value, int maxAge) {
		Cookie cookie = new Cookie(name, value);
		cookie.setHttpOnly(true);
		cookie.setSecure(true); // HTTPS 환경에서만 전송
		cookie.setPath("/");
		cookie.setMaxAge(maxAge);
		cookie.setAttribute("SameSite", "Lax");
		return cookie;
	}

	/**
	 * Strict Cookie 생성 (SameSite=Strict)
	 *
	 * Refresh Token 등 민감한 정보에 사용
	 * 외부 사이트에서의 모든 요청에 대해 쿠키 전송 차단 (완벽한 CSRF 방어)
	 *
	 * @param name     쿠키 이름
	 * @param value    쿠키 값
	 * @param maxAge   만료 시간 (초)
	 * @return Cookie
	 */
	public static Cookie createStrictCookie(String name, String value, int maxAge) {
		Cookie cookie = new Cookie(name, value);
		cookie.setHttpOnly(true);
		cookie.setSecure(true);
		cookie.setPath("/");
		cookie.setMaxAge(maxAge);
		cookie.setAttribute("SameSite", "Strict");
		return cookie;
	}

	/**
	 * 요청에서 Cookie 조회
	 *
	 * @param request HttpServletRequest
	 * @param name    쿠키 이름
	 * @return Cookie (Optional)
	 */
	public static Optional<Cookie> getCookie(HttpServletRequest request, String name) {
		Cookie[] cookies = request.getCookies();

		if (cookies != null && cookies.length > 0) {
			for (Cookie cookie : cookies) {
				if (name.equals(cookie.getName())) {
					return Optional.of(cookie);
				}
			}
		}

		return Optional.empty();
	}

	/**
	 * Cookie 추가 (SameSite=Lax)
	 *
	 * Access Token 등 일반적인 요청에 사용
	 *
	 * @param response HttpServletResponse
	 * @param name     쿠키 이름
	 * @param value    쿠키 값
	 * @param maxAge   만료 시간 (초)
	 */
	public static void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
		Cookie cookie = createCookie(name, value, maxAge);
		response.addCookie(cookie);
	}

	/**
	 * Strict Cookie 추가 (SameSite=Strict)
	 *
	 * Refresh Token 등 민감한 정보에 사용
	 *
	 * @param response HttpServletResponse
	 * @param name     쿠키 이름
	 * @param value    쿠키 값
	 * @param maxAge   만료 시간 (초)
	 */
	public static void addStrictCookie(HttpServletResponse response, String name, String value, int maxAge) {
		Cookie cookie = createStrictCookie(name, value, maxAge);
		response.addCookie(cookie);
	}

	/**
	 * Cookie 삭제
	 *
	 * @param request  HttpServletRequest
	 * @param response HttpServletResponse
	 * @param name     쿠키 이름
	 */
	public static void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
		Cookie[] cookies = request.getCookies();

		if (cookies != null && cookies.length > 0) {
			for (Cookie cookie : cookies) {
				if (name.equals(cookie.getName())) {
					cookie.setValue("");
					cookie.setPath("/");
					cookie.setMaxAge(0);
					response.addCookie(cookie);
				}
			}
		}
	}
}
