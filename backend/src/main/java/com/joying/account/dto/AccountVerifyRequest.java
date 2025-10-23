package com.joying.account.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌 인증 요청 DTO
 */
@Getter
@NoArgsConstructor
public class AccountVerifyRequest {

	@NotBlank(message = "핀테크 이용번호는 필수입니다")
	private String fintechUseNum;

	@NotBlank(message = "은행 코드는 필수입니다")
	private String bankCodeStd;

	@NotBlank(message = "은행 이름은 필수입니다")
	private String bankName;

	private String accountNum;

	@NotBlank(message = "예금주명은 필수입니다")
	private String accountHolderName;

	/**
	 * 계좌 상태 (01:정상, 02:휴면, 03:해지, 04:정지)
	 * 오픈뱅킹 API에서 제공하는 account_state 값
	 */
	private String accountState;
}