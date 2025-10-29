package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 1원 인증 확인 응답 (checkAuthCode)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CheckAuthCodeResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private CheckAuthCodeRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class CheckAuthCodeRec {

		@JsonProperty("status")
		private String status;

		@JsonProperty("transactionUniqueNo")
		private String transactionUniqueNo;

		@JsonProperty("accountNo")
		private String accountNo;
	}
}