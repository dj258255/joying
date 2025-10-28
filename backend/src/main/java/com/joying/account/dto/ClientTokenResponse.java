package com.joying.account.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 이용기관 인증 토큰 응답 DTO (2-legged)
 */
@Getter
@NoArgsConstructor
public class ClientTokenResponse {

	@JsonProperty("access_token")
	private String accessToken;

	@JsonProperty("token_type")
	private String tokenType;

	@JsonProperty("expires_in")
	private Integer expiresIn;

	@JsonProperty("scope")
	private String scope;

	@JsonProperty("client_use_code")
	private String clientUseCode;
}
