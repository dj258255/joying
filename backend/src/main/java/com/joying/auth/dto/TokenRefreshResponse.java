package com.joying.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Access Token 재발급 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Access Token 재발급 응답")
public class TokenRefreshResponse {

	@Schema(description = "회원 ID", example = "1")
	private Long memberId;

	@Schema(description = "새로운 Access Token")
	private String accessToken;

	@Schema(description = "만료 시간 (초)", example = "3600")
	private Long expiresIn;
}