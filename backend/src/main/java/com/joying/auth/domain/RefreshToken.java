package com.joying.auth.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

/**
 * Refresh Token (Redis에 저장)
 *
 * TTL: 7일 (604800초)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@RedisHash(value = "refreshToken", timeToLive = 604800)
public class RefreshToken {

	/**
	 * Redis Key (Refresh Token 자체를 ID로 사용)
	 */
	@Id
	private String token;

	/**
	 * 회원 ID (인덱싱하여 회원 ID로 검색 가능)
	 */
	@Indexed
	private Long memberId;

	/**
	 * TTL (초 단위)
	 * 기본값: 7일 (604800초)
	 */
	@TimeToLive
	private Long expiration;

	/**
	 * Refresh Token 갱신
	 *
	 * @param newToken 새로운 토큰
	 */
	public void updateToken(String newToken) {
		this.token = newToken;
	}
}