package com.joying.account.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

/**
 * 오픈뱅킹 계좌실명조회 API 요청 DTO
 *
 * POST /v2.0/inquiry/real_name
 */
@Getter
@Builder
public class OpenBankingRealNameRequest {

	@JsonProperty("bank_tran_id")
	private String bankTranId;  // 은행거래고유번호 (이용기관코드 + U + 난수 9자리)

	@JsonProperty("bank_code_std")
	private String bankCodeStd;  // 표준 은행 코드 (3자리)

	@JsonProperty("account_num")
	private String accountNum;  // 계좌번호

	@JsonProperty("account_holder_info_type")
	private String accountHolderInfoType;  // 예금주 실명번호 구분코드 (" "=생년월일)

	@JsonProperty("account_holder_info")
	private String accountHolderInfo;  // 예금주 인증정보 (생년월일 등)

	@JsonProperty("tran_dtime")
	private String tranDtime;  // 거래시각 (YYYYMMDDHHmmss)
}
