package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌거래내역조회(단건) 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireTransactionHistoryResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private TransactionRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class TransactionRec {

		@JsonProperty("transactionUniqueNo")
		private String transactionUniqueNo;

		@JsonProperty("transactionDate")
		private String transactionDate;

		@JsonProperty("transactionTime")
		private String transactionTime;

		@JsonProperty("transactionType")
		private String transactionType;

		@JsonProperty("transactionTypeName")
		private String transactionTypeName;

		@JsonProperty("transactionAccountNo")
		private String transactionAccountNo;

		@JsonProperty("transactionBalance")
		private Long transactionBalance;

		@JsonProperty("transactionAfterBalance")
		private Long transactionAfterBalance;

		@JsonProperty("transactionSummary")
		private String transactionSummary;

		@JsonProperty("transactionMemo")
		private String transactionMemo;
	}
}