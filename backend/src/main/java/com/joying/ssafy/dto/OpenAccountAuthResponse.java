package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 1원 송금 응답 (openAccountAuth)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class OpenAccountAuthResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private OpenAccountAuthRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class OpenAccountAuthRec {

		@JsonProperty("transactionUniqueNo")
		private String transactionUniqueNo;

		@JsonProperty("accountNo")
		private String accountNo;
	}
}