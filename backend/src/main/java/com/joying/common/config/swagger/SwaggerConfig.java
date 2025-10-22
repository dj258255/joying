package com.joying.common.config.swagger;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
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
				.description("커뮤니티 기반 장비 대여 플랫폼 API 문서")
				.version("v1.0.0")
				.contact(new Contact()
					.name("Joying Team")
					.email("dev@joying.com")
					.url("https://joying.com"))
				.license(new License()
					.name("Apache 2.0")
					.url("https://www.apache.org/licenses/LICENSE-2.0.html")))
			.addServersItem(new Server()
				.url("http://localhost:8080")
				.description("로컬 개발 서버"))
			.addServersItem(new Server()
				.url("https://api.joying.com")
				.description("프로덕션 서버"))
			.addSecurityItem(new SecurityRequirement()
				.addList("Bearer Authentication"))
			.components(new Components()
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