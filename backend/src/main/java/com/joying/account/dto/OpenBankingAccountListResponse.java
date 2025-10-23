package com.joying.account.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 오픈뱅킹 계좌 목록 조회 응답
 */
@Getter
@NoArgsConstructor
public class OpenBankingAccountListResponse {

	@JsonProperty("api_tran_id")
	private String apiTranId;

	@JsonProperty("api_tran_dtm")
	private String apiTranDtm;

	@JsonProperty("rsp_code")
	private String rspCode;

	@JsonProperty("rsp_message")
	private String rspMessage;

	@JsonProperty("user_name")
	private String userName;

	@JsonProperty("res_cnt")
	private Integer resCnt;

	@JsonProperty("res_list")
	private List<AccountInfo> resList;

	@Getter
	@NoArgsConstructor
	public static class AccountInfo {

		@JsonProperty("fintech_use_num")
		private String fintechUseNum;

		@JsonProperty("account_alias")
		private String accountAlias;

		@JsonProperty("bank_code_std")
		private String bankCodeStd;

		@JsonProperty("bank_code_sub")
		private String bankCodeSub;

		@JsonProperty("bank_name")
		private String bankName;

		@JsonProperty("account_num_masked")
		private String accountNumMasked;

		@JsonProperty("account_holder_name")
		private String accountHolderName;

		@JsonProperty("account_holder_type")
		private String accountHolderType;

		@JsonProperty("account_type")
		private String accountType;

		@JsonProperty("inquiry_agree_yn")
		private String inquiryAgreeYn;

		@JsonProperty("inquiry_agree_dtime")
		private String inquiryAgreeDtime;

		@JsonProperty("transfer_agree_yn")
		private String transferAgreeYn;

		@JsonProperty("transfer_agree_dtime")
		private String transferAgreeDtime;

		@JsonProperty("account_state")
		private String accountState;
	}
}
