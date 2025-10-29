package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 금융망 회원 등록 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberRegisterRequest {

	@JsonProperty("apiKey")
	private String apiKey;

	@JsonProperty("userId")
	private String userId;
}