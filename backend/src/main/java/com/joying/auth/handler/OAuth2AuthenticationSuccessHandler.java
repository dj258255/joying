package com.joying.auth.handler;

import com.joying.auth.domain.RefreshToken;
import com.joying.auth.oauth.CustomOAuth2User;
import com.joying.auth.repository.RefreshTokenRepository;
import com.joying.common.config.security.JwtProperties;
import com.joying.common.config.security.JwtTokenProvider;
import com.joying.common.util.CookieUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * OAuth2 인증 성공 핸들러
 *
 * OAuth2 로그인 성공 시:
 * 1. JWT Access Token 발급
 * 2. JWT Refresh Token 발급 및 Redis 저장
 * 3. 토큰을 Cookie에 저장
 * 4. 프론트엔드 리다이렉트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;
	private final RefreshTokenRepository refreshTokenRepository;

	/**
	 * 프론트엔드 리다이렉트 URL
	 * 환경 변수로 설정 가능 (application.properties)
	 */
	@Value("${oauth2.redirect-uri:http://localhost:3000/auth/callback}")
	private String redirectUri;

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request,
	                                    HttpServletResponse response,
	                                    Authentication authentication) throws IOException {

		CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();

		log.info("OAuth2 인증 성공: memberId={}, email={}",
			oAuth2User.getMemberId(), oAuth2User.getEmail());

		// 1. Access Token 생성
		String accessToken = jwtTokenProvider.createAccessToken(
			oAuth2User.getMemberId(),
			oAuth2User.getEmail()
		);

		// 2. Refresh Token 생성
		String refreshTokenValue = jwtTokenProvider.createRefreshToken(oAuth2User.getMemberId());

		// 3. Refresh Token을 Redis에 저장
		RefreshToken refreshToken = RefreshToken.builder()
			.token(refreshTokenValue)
			.memberId(oAuth2User.getMemberId())
			.expiration(jwtTokenProvider.getRefreshTokenExpirationInSeconds())
			.build();

		refreshTokenRepository.save(refreshToken);

		// 4. Access Token을 Cookie에 저장 (SameSite=Lax)
		CookieUtil.addCookie(
			response,
			jwtProperties.getAccessTokenCookieName(),
			accessToken,
			(int) jwtTokenProvider.getAccessTokenExpirationInSeconds()
		);

		// 5. Refresh Token을 Cookie에 저장 (SameSite=Strict, HttpOnly, Secure)
		CookieUtil.addStrictCookie(
			response,
			jwtProperties.getRefreshTokenCookieName(),
			refreshTokenValue,
			(int) jwtTokenProvider.getRefreshTokenExpirationInSeconds()
		);

		log.info("JWT 토큰 발급 완료: memberId={}", oAuth2User.getMemberId());

		// 6. 프론트엔드 리다이렉트
		String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
			.queryParam("login", "success")
			.build()
			.toUriString();

		getRedirectStrategy().sendRedirect(request, response, targetUrl);
	}
}