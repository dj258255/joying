package com.joying.common.config.swagger;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

/**
 * Swagger/OpenAPI 설정
 *
 * API 문서 자동 생성 및 Swagger UI 제공
 */
@Configuration
public class SwaggerConfig {

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI()
			.info(new Info()
				.title("Joying API")
				.description("""
					커뮤니티 기반 장비 대여 플랫폼 API 문서

					## 인증 방법
					### 1. OAuth2 카카오 로그인 (권장)
					- 로그인 URL: `GET /oauth2/authorization/kakao`
					- 브라우저에서 위 URL로 접근하면 카카오 로그인 페이지로 리다이렉트됩니다
					- 로그인 완료 후 JWT 토큰이 쿠키에 자동으로 설정됩니다
					- **같은 브라우저에서 Swagger를 사용하면 쿠키가 자동으로 전송되어 인증됩니다**

					### 2. Bearer Token 직접 입력 (쿠키가 안 될 경우)
					- 우측 상단 Authorize 버튼 클릭
					- Access Token을 입력하세요 (Bearer 접두사 제외)
					- 브라우저 Console에서 `document.cookie`로 토큰 확인 가능
					""")
				.version("v1.0.0"))
			.addServersItem(new Server()
				.url("http://localhost:8080")
				.description("로컬 개발 서버"))
			.addServersItem(new Server()
				.url("https://k13c202.p.ssafy.io")
				.description("프로덕션 서버"))
			.addSecurityItem(new SecurityRequirement()
				.addList("Cookie Authentication"))
			.addSecurityItem(new SecurityRequirement()
				.addList("Bearer Authentication"))
			.components(new Components()
				.addSecuritySchemes("Cookie Authentication",
					new SecurityScheme()
						.type(SecurityScheme.Type.APIKEY)
						.in(SecurityScheme.In.COOKIE)
						.name("access_token")
						.description("쿠키 기반 JWT 인증 (OAuth2 로그인 후 자동 설정)"))
				.addSecuritySchemes("Bearer Authentication",
					new SecurityScheme()
						.type(SecurityScheme.Type.HTTP)
						.scheme("bearer")
						.bearerFormat("JWT")
						.in(SecurityScheme.In.HEADER)
						.name("Authorization")
						.description("JWT 토큰을 입력하세요 (Bearer 접두사 제외)")));
	}
}