package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 예금주 조회 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireDemandDepositAccountHolderNameResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private InquireAccountHolderRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class InquireAccountHolderRec {

		@JsonProperty("bankCode")
		private String bankCode;

		@JsonProperty("accountNo")
		private String accountNo;

		@JsonProperty("userName")
		private String userName;
	}
}