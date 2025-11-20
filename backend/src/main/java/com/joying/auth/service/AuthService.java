package com.joying.auth.service;

import com.joying.auth.domain.RefreshToken;
import com.joying.auth.dto.TokenRefreshResponse;
import com.joying.auth.repository.RefreshTokenRepository;
import com.joying.common.config.security.JwtProperties;
import com.joying.common.config.security.JwtTokenProvider;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.common.util.CookieUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 인증 서비스
 *
 * 로그아웃, 토큰 리프레시 등의 인증 관련 비즈니스 로직 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;
	private final RefreshTokenRepository refreshTokenRepository;

	/**
	 * 로그아웃
	 *
	 * 1. Refresh Token을 Redis에서 삭제
	 * 2. Access Token과 Refresh Token 쿠키 삭제
	 *
	 * @param request  HttpServletRequest
	 * @param response HttpServletResponse
	 */
	@Transactional
	public void logout(HttpServletRequest request, HttpServletResponse response) {
		// 1. Refresh Token 쿠키 추출
		Optional<Cookie> refreshTokenCookie = CookieUtil.getCookie(
			request,
			jwtProperties.getRefreshTokenCookieName()
		);

		if (refreshTokenCookie.isPresent()) {
			String refreshToken = refreshTokenCookie.get().getValue();

			// 2. Redis에서 Refresh Token 삭제
			refreshTokenRepository.deleteById(refreshToken);

			log.info("Refresh Token 삭제 완료");
		}

		// 3. Access Token 쿠키 삭제
		CookieUtil.deleteCookie(request, response, jwtProperties.getAccessTokenCookieName());

		// 4. Refresh Token 쿠키 삭제
		CookieUtil.deleteCookie(request, response, jwtProperties.getRefreshTokenCookieName());
	}

	/**
	 * Access Token 재발급
	 *
	 * 1. Refresh Token 검증
	 * 2. 새로운 Access Token 발급
	 * 3. Access Token을 쿠키에 저장
	 *
	 * @param request  HttpServletRequest
	 * @param response HttpServletResponse
	 * @return TokenRefreshResponse (새로운 Access Token 정보)
	 */
	@Transactional(readOnly = true)
	public TokenRefreshResponse refreshAccessToken(HttpServletRequest request,
	                                                HttpServletResponse response) {

		// 1. Refresh Token 쿠키 추출
		Optional<Cookie> refreshTokenCookie = CookieUtil.getCookie(
			request,
			jwtProperties.getRefreshTokenCookieName()
		);

		if (refreshTokenCookie.isEmpty()) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "Refresh Token이 없습니다.");
		}

		String refreshTokenValue = refreshTokenCookie.get().getValue();

		// 2. Refresh Token 유효성 검증
		if (!jwtTokenProvider.validateToken(refreshTokenValue)) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 Refresh Token입니다.");
		}

		// 3. Redis에서 Refresh Token 조회
		RefreshToken refreshToken = refreshTokenRepository.findById(refreshTokenValue)
			.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Refresh Token이 만료되었거나 존재하지 않습니다."));

		Long memberId = refreshToken.getMemberId();

		// 4. Access Token 쿠키에서 이메일 추출 (기존 Access Token)
		String email = extractEmailFromRequest(request);

		// 5. 새로운 Access Token 생성
		String newAccessToken = jwtTokenProvider.createAccessToken(memberId, email);

		// 6. Access Token을 쿠키에 저장
		CookieUtil.addCookie(
			response,
			jwtProperties.getAccessTokenCookieName(),
			newAccessToken,
			(int) jwtTokenProvider.getAccessTokenExpirationInSeconds()
		);

		log.info("Access Token 재발급 완료: memberId={}", memberId);

		return TokenRefreshResponse.builder()
			.memberId(memberId)
			.accessToken(newAccessToken)
			.expiresIn(jwtTokenProvider.getAccessTokenExpirationInSeconds())
			.build();
	}

	/**
	 * 요청에서 이메일 추출
	 *
	 * Access Token 또는 Authorization 헤더에서 이메일 정보 추출
	 *
	 * @param request HttpServletRequest
	 * @return 이메일
	 */
	private String extractEmailFromRequest(HttpServletRequest request) {
		// 1. Access Token 쿠키에서 추출 시도
		Optional<Cookie> accessTokenCookie = CookieUtil.getCookie(
			request,
			jwtProperties.getAccessTokenCookieName()
		);

		if (accessTokenCookie.isPresent()) {
			String accessToken = accessTokenCookie.get().getValue();
			try {
				return jwtTokenProvider.getEmail(accessToken);
			} catch (Exception e) {
				log.warn("Access Token에서 이메일 추출 실패 (만료된 토큰일 수 있음): {}", e.getMessage());
			}
		}

		// 2. Authorization 헤더에서 추출 시도
		String bearerToken = request.getHeader("Authorization");
		if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
			String token = bearerToken.substring(7);
			try {
				return jwtTokenProvider.getEmail(token);
			} catch (Exception e) {
				log.warn("Authorization 헤더에서 이메일 추출 실패: {}", e.getMessage());
			}
		}

		throw new BusinessException(ErrorCode.UNAUTHORIZED,
			"이메일 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
	}
}