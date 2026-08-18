package com.joying.ssafy.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌거래내역조회(목록) 응답.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InquireTransactionHistoryListResponse {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("REC")
	private TransactionListRec rec;

	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	@JsonIgnoreProperties(ignoreUnknown = true)
	public static class TransactionListRec {

		@JsonProperty("totalCount")
		private String totalCount;

		@JsonProperty("list")
		private List<InquireTransactionHistoryResponse.TransactionRec> list;
	}
}
