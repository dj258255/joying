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
	@Transactional
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

		// 4. 새로운 Access Token 생성
		String email = jwtTokenProvider.getEmail(refreshTokenValue);
		String newAccessToken = jwtTokenProvider.createAccessToken(memberId, email);

		// 5. Access Token을 쿠키에 저장
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
}