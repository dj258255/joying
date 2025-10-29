package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수시입출금 계좌 생성 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDemandDepositAccountResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private CreateDemandDepositAccountRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class CreateDemandDepositAccountRec {

		@JsonProperty("bankCode")
		private String bankCode;

		@JsonProperty("accountNo")
		private String accountNo;

		@JsonProperty("currency")
		private Currency currency;

		@Getter
		@NoArgsConstructor
		@AllArgsConstructor
		@Builder
		public static class Currency {

			@JsonProperty("currency")
			private String currency;

			@JsonProperty("currencyName")
			private String currencyName;
		}
	}
}
