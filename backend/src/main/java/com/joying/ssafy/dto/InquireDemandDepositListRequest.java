package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수시입출금 상품 조회 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireDemandDepositListRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;
}
