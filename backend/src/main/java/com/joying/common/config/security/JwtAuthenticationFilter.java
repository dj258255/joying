package com.joying.common.config.security;

import com.joying.common.util.CookieUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * JWT 인증 필터
 *
 * 모든 HTTP 요청에 대해 JWT 토큰을 검증하고
 * 유효한 경우 SecurityContext에 인증 정보를 설정합니다.
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;

	/**
	 * Swagger UI 경로는 JWT 필터를 건너뜀
	 */
	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String path = request.getRequestURI();
		return path.startsWith("/swagger-ui") ||
		       path.startsWith("/v3/api-docs") ||
		       path.startsWith("/api-docs") ||
		       path.startsWith("/swagger-resources") ||
		       path.startsWith("/webjars");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request,
	                                HttpServletResponse response,
	                                FilterChain filterChain) throws ServletException, IOException {

		// 1. 요청에서 JWT 토큰 추출 (Cookie 또는 Authorization 헤더)
		String token = extractToken(request);

		// 2. 토큰 유효성 검증
		if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
			try {
				// 3. 토큰에서 Authentication 객체 생성
				Authentication authentication = jwtTokenProvider.getAuthentication(token);

				// 4. SecurityContext에 인증 정보 설정
				SecurityContextHolder.getContext().setAuthentication(authentication);

				log.debug("JWT 인증 성공: memberId={}, uri={}",
					authentication.getName(), request.getRequestURI());

			} catch (Exception e) {
				log.error("JWT 인증 실패: {}", e.getMessage());
				SecurityContextHolder.clearContext();
			}
		}

		filterChain.doFilter(request, response);
	}

	/**
	 * 요청에서 JWT 토큰 추출
	 *
	 * 우선순위:
	 * 1. Cookie (access_token)
	 * 2. Authorization 헤더 (Bearer {token})
	 *
	 * @param request HttpServletRequest
	 * @return JWT 토큰 (없으면 null)
	 */
	private String extractToken(HttpServletRequest request) {
		// 1. Cookie에서 토큰 추출 (우선순위 높음)
		Optional<Cookie> cookie = CookieUtil.getCookie(
			request,
			jwtProperties.getAccessTokenCookieName()
		);

		if (cookie.isPresent()) {
			String token = cookie.get().getValue();
			if (StringUtils.hasText(token)) {
				return token;
			}
		}

		// 2. Authorization 헤더에서 토큰 추출
		String bearerToken = request.getHeader("Authorization");
		if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
			return bearerToken.substring(7);
		}

		return null;
	}
}