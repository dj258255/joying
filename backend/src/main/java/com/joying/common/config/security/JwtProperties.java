package com.joying.common.config.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * JWT 설정 프로퍼티
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

	/**
	 * JWT 시크릿 키 (최소 256비트 권장)
	 */
	private String secret;

	/**
	 * Access Token 만료 시간 (밀리초)
	 * 기본값: 1시간 (3600000ms)
	 */
	private Long accessTokenExpiration = 3600000L;

	/**
	 * Refresh Token 만료 시간 (밀리초)
	 * 기본값: 7일 (604800000ms)
	 */
	private Long refreshTokenExpiration = 604800000L;

	/**
	 * Cookie 이름 (Access Token)
	 */
	private String accessTokenCookieName = "access_token";

	/**
	 * Cookie 이름 (Refresh Token)
	 */
	private String refreshTokenCookieName = "refresh_token";
}