package com.joying.common.config.security;

import com.joying.auth.handler.OAuth2AuthenticationFailureHandler;
import com.joying.auth.handler.OAuth2AuthenticationSuccessHandler;
import com.joying.auth.service.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Spring Security 설정
 *
 * OAuth2 + JWT 기반 인증/인가
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final CustomOAuth2UserService customOAuth2UserService;
	private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
	private final OAuth2AuthenticationFailureHandler oAuth2FailureHandler;
	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;

	/**
	 * CORS 허용 Origin 목록 (환경변수에서 주입)
	 * application.properties: cors.allowed-origins=${CORS_ALLOWED_ORIGINS},http://localhost:8080
	 * .env: CORS_ALLOWED_ORIGINS=http://localhost:5173
	 */
	@Value("${cors.allowed-origins}")
	private List<String> allowedOrigins;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			// CSRF 비활성화 (JWT 사용)
			.csrf(AbstractHttpConfigurer::disable)
			// CORS 설정
			.cors(cors -> cors.configurationSource(corsConfigurationSource()))
			// Form Login, HTTP Basic 비활성화
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			// 세션 사용 안 함 (Stateless)
			.sessionManagement(session ->
				session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
			)
			// 인증/인가 규칙
			.authorizeHttpRequests(auth -> auth
				// 인증 없이 접근 가능한 경로
				.requestMatchers(
					"/",
					"/error",
					"/favicon.ico",
					// 정적 리소스 (이미지 등)
					"/images/**",
					"/files/**",
					// Swagger UI 관련 경로
					"/swagger-ui/**",
					"/swagger-ui.html",
					"/v3/api-docs/**",
					"/swagger-resources/**",
					"/webjars/**",
					"/api-docs/**",
					"/api/v1/products/**"
				).permitAll()
				// OAuth2 로그인 엔드포인트
				.requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
				// 계좌 1원 인증 엔드포인트 (SSAFY 금융망 API)
				.requestMatchers("/api/v1/accounts/verify/**").permitAll()
				// 그 외 모든 요청은 인증 필요
				.anyRequest().authenticated()
			)

			// OAuth2 로그인 설정
			.oauth2Login(oauth2 -> oauth2
				.loginPage("/oauth2/authorization/kakao") // 명시적 로그인 페이지 설정 (자동 리다이렉트 방지)
				.userInfoEndpoint(userInfo ->
					userInfo.userService(customOAuth2UserService)
				)
				.successHandler(oAuth2SuccessHandler)
				.failureHandler(oAuth2FailureHandler)
			)
			// 인증되지 않은 요청에 대해 예외 처리 (OAuth2 자동 리다이렉트 방지)
			.exceptionHandling(exception -> exception
				.authenticationEntryPoint((request, response, authException) -> {
					// 나머지는 401 응답
					response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
					response.setContentType("application/json;charset=UTF-8");
					response.setCharacterEncoding(StandardCharsets.UTF_8.name());
					response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"인증이 필요합니다.\"}");
				})
			)

			// JWT 인증 필터 추가
			.addFilterBefore(
				new JwtAuthenticationFilter(jwtTokenProvider, jwtProperties),
				UsernamePasswordAuthenticationFilter.class
			);

		return http.build();
	}

	/**
	 * CORS 설정 (환경변수 기반)
	 */
	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		// 허용할 Origin (환경변수에서 주입)
		configuration.setAllowedOrigins(allowedOrigins);
		// 허용할 HTTP 메서드
		configuration.setAllowedMethods(Arrays.asList(
			"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
		));
		// 허용할 헤더
		configuration.setAllowedHeaders(Arrays.asList("*"));
		// 쿠키 전송 허용
		configuration.setAllowCredentials(true);
		// 노출할 헤더 (프론트엔드에서 접근 가능)
		configuration.setExposedHeaders(Arrays.asList("Authorization"));
		// Preflight 요청 캐시 시간 (초)
		configuration.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}
}