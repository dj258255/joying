package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 예금주 조회 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireDemandDepositAccountHolderNameRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("accountNo")
	private String accountNo;
}