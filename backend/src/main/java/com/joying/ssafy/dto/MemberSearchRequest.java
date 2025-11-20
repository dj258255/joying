package com.joying.ssafy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 금융망 사용자 계정 조회 요청 DTO
 *
 * API: POST /ssafy/api/v1/member/search
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SSAFY 사용자 계정 조회 요청")
public class MemberSearchRequest {

	@Schema(description = "사용자 ID (이메일 형식)", example = "test@ssafy.co.kr", required = true)
	private String userId;

	@Schema(description = "API 키", example = "8644e48ee75740469ef8b5214499e5f7", required = true)
	private String apiKey;
}