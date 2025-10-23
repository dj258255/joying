package com.joying.common.config.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;

/**
 * JWT 토큰 생성 및 검증 유틸리티
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

	private final JwtProperties jwtProperties;
	private SecretKey secretKey;

	/**
	 * SecretKey 초기화
	 */
	@PostConstruct
	protected void init() {
		this.secretKey = Keys.hmacShaKeyFor(
			jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8)
		);
	}

	/**
	 * Access Token 생성
	 *
	 * @param memberId 회원 ID
	 * @param email    이메일
	 * @return Access Token
	 */
	public String createAccessToken(Long memberId, String email) {
		Date now = new Date();
		Date expiration = new Date(now.getTime() + jwtProperties.getAccessTokenExpiration());

		return Jwts.builder()
			.setSubject(String.valueOf(memberId))
			.claim("email", email)
			.setIssuedAt(now)
			.setExpiration(expiration)
			.signWith(secretKey, SignatureAlgorithm.HS256)
			.compact();
	}

	/**
	 * Refresh Token 생성
	 *
	 * @param memberId 회원 ID
	 * @return Refresh Token
	 */
	public String createRefreshToken(Long memberId) {
		Date now = new Date();
		Date expiration = new Date(now.getTime() + jwtProperties.getRefreshTokenExpiration());

		return Jwts.builder()
			.setSubject(String.valueOf(memberId))
			.setIssuedAt(now)
			.setExpiration(expiration)
			.signWith(secretKey, SignatureAlgorithm.HS256)
			.compact();
	}

	/**
	 * JWT 토큰에서 회원 ID 추출
	 *
	 * @param token JWT 토큰
	 * @return 회원 ID
	 */
	public Long getMemberId(String token) {
		return Long.parseLong(getClaims(token).getSubject());
	}

	/**
	 * JWT 토큰에서 이메일 추출
	 *
	 * @param token JWT 토큰
	 * @return 이메일
	 */
	public String getEmail(String token) {
		return getClaims(token).get("email", String.class);
	}

	/**
	 * JWT 토큰에서 Authentication 객체 생성
	 *
	 * @param token JWT 토큰
	 * @return Authentication 객체
	 */
	public Authentication getAuthentication(String token) {
		Claims claims = getClaims(token);
		return new UsernamePasswordAuthenticationToken(claims.getSubject(), "", Collections.emptyList());
	}

	/**
	 * JWT 토큰 유효성 검증
	 *
	 * @param token JWT 토큰
	 * @return 유효 여부
	 */
	public boolean validateToken(String token) {
		try {
			getClaims(token);
			return true;
		} catch (ExpiredJwtException e) {
			log.error("만료된 JWT 토큰입니다: {}", e.getMessage());
		} catch (UnsupportedJwtException e) {
			log.error("지원하지 않는 JWT 토큰입니다: {}", e.getMessage());
		} catch (MalformedJwtException e) {
			log.error("잘못된 형식의 JWT 토큰입니다: {}", e.getMessage());
		} catch (SecurityException e) {
			log.error("JWT 서명 검증에 실패했습니다: {}", e.getMessage());
		} catch (IllegalArgumentException e) {
			log.error("JWT 토큰이 비어있습니다: {}", e.getMessage());
		}
		return false;
	}

	/**
	 * JWT 토큰에서 Claims 추출
	 *
	 * @param token JWT 토큰
	 * @return Claims
	 */
	private Claims getClaims(String token) {
		return Jwts.parser()
			.verifyWith(secretKey)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}

	/**
	 * Access Token 만료 시간 반환 (초)
	 *
	 * @return Access Token 만료 시간 (초)
	 */
	public long getAccessTokenExpirationInSeconds() {
		return jwtProperties.getAccessTokenExpiration() / 1000;
	}

	/**
	 * Refresh Token 만료 시간 반환 (초)
	 *
	 * @return Refresh Token 만료 시간 (초)
	 */
	public long getRefreshTokenExpirationInSeconds() {
		return jwtProperties.getRefreshTokenExpiration() / 1000;
	}
}