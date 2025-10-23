package com.joying.account.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 오픈뱅킹 계좌실명조회 API 응답 DTO
 *
 * POST /v2.0/inquiry/real_name
 */
@Getter
@NoArgsConstructor
public class OpenBankingRealNameResponse {

	@JsonProperty("api_tran_id")
	private String apiTranId;  // API 거래고유번호

	@JsonProperty("api_tran_dtm")
	private String apiTranDtm;  // API 거래일시

	@JsonProperty("rsp_code")
	private String rspCode;  // 응답코드 (A0000: 성공)

	@JsonProperty("rsp_message")
	private String rspMessage;  // 응답메시지

	@JsonProperty("bank_tran_id")
	private String bankTranId;  // 은행거래고유번호

	@JsonProperty("bank_tran_date")
	private String bankTranDate;  // 거래일자 (YYYYMMDD)

	@JsonProperty("bank_code_std")
	private String bankCodeStd;  // 표준 은행 코드

	@JsonProperty("bank_code_sub")
	private String bankCodeSub;  // 점별 코드

	@JsonProperty("bank_name")
	private String bankName;  // 은행명

	@JsonProperty("account_num")
	private String accountNum;  // 계좌번호

	@JsonProperty("account_num_masked")
	private String accountNumMasked;  // 계좌번호 마스킹 (123******890)

	@JsonProperty("account_holder_name")
	private String accountHolderName;  // 예금주명

	@JsonProperty("account_holder_type")
	private String accountHolderType;  // 예금주 구분 (1:개인, 2:법인)

	@JsonProperty("account_type")
	private String accountType;  // 계좌 구분 (1:수시입출금, 2:예적금 등)

	@JsonProperty("account_seq")
	private String accountSeq;  // 계좌일련번호

	/**
	 * 성공 여부 확인
	 *
	 * @return 응답코드가 A0000이면 성공
	 */
	public boolean isSuccess() {
		return "A0000".equals(rspCode);
	}
}