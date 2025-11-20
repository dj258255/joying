package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 수시입출금 상품 조회 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireDemandDepositListResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private List<DemandDepositProduct> rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class DemandDepositProduct {

		@JsonProperty("bankCode")
		private String bankCode;

		@JsonProperty("bankName")
		private String bankName;

		@JsonProperty("accountTypeUniqueNo")
		private String accountTypeUniqueNo;

		@JsonProperty("accountTypeName")
		private String accountTypeName;

		@JsonProperty("accountDescription")
		private String accountDescription;
	}
}
