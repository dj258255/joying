package com.joying.account.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 계좌실명조회 요청 (사용자 입력)
 */
@Data
@Schema(description = "계좌 인증 요청")
public class AccountRealNameRequest {

	@NotBlank(message = "은행 코드는 필수입니다")
	@Schema(description = "은행 코드 (예: 004=국민은행, 088=신한은행)", example = "004")
	@JsonProperty("bankCode")
	private String bankCode;

	@NotBlank(message = "계좌번호는 필수입니다")
	@Schema(description = "계좌번호 (하이픈 없이)", example = "12345678901234")
	@JsonProperty("accountNum")
	private String accountNum;

	@NotBlank(message = "예금주 생년월일은 필수입니다")
	@Schema(description = "예금주 생년월일 (YYYYMMDD)", example = "19900101")
	@JsonProperty("accountHolderInfo")
	private String accountHolderInfo;
}