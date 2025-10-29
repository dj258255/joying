package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수시입출금 계좌 생성 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDemandDepositAccountRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("accountTypeUniqueNo")
	private String accountTypeUniqueNo;
}
