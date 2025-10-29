package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 금융망 회원 등록 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MemberRegisterResponse {

	@JsonProperty("userId")
	private String userId;

	@JsonProperty("userName")
	private String userName;

	@JsonProperty("institutionCode")
	private String institutionCode;

	@JsonProperty("userKey")
	private String userKey; // 초기에는 빈 문자열

	@JsonProperty("created")
	private String created;

	@JsonProperty("modified")
	private String modified;

	@JsonProperty("apiKey")
	private String apiKey;
}