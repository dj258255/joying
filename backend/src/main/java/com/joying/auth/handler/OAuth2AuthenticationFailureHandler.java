package com.joying.auth.handler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * OAuth2 인증 실패 핸들러
 *
 * OAuth2 로그인 실패 시 프론트엔드로 에러 정보와 함께 리다이렉트
 */
@Slf4j
@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

	@Value("${oauth2.redirect-uri:http://localhost:3000/auth/callback}")
	private String redirectUri;

	@Override
	public void onAuthenticationFailure(HttpServletRequest request,
	                                    HttpServletResponse response,
	                                    AuthenticationException exception) throws IOException {

		log.error("OAuth2 인증 실패: {}", exception.getMessage());

		String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
			.queryParam("login", "failed")
			.queryParam("error", exception.getLocalizedMessage())
			.build()
			.toUriString();

		getRedirectStrategy().sendRedirect(request, response, targetUrl);
	}
}