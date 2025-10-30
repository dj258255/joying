package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌거래내역조회(단건) 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireTransactionHistoryRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("accountNo")
	private String accountNo;

	@JsonProperty("transactionUniqueNo")
	private String transactionUniqueNo;
}