package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌거래내역조회(목록) 요청.
 *
 * <p>단건 조회는 거래고유번호가 있어야 한다. 송금 결과가 미확정으로 남은 건은 그 번호를
 * 받지 못했으므로 단건으로는 확인할 수 없다. 그래서 계좌의 기간별 목록을 받아
 * 거래 요약에 심어 둔 주문번호로 찾는다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquireTransactionHistoryListRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@JsonProperty("accountNo")
	private String accountNo;

	/** yyyyMMdd */
	@JsonProperty("startDate")
	private String startDate;

	/** yyyyMMdd */
	@JsonProperty("endDate")
	private String endDate;

	/** A 전체, M 입금, D 출금 */
	@JsonProperty("transactionType")
	private String transactionType;

	/** ASC 오름차순, DESC 내림차순 */
	@JsonProperty("orderByType")
	private String orderByType;
}
