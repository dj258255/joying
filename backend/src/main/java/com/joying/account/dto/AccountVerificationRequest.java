package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌 인증 요청 (클라이언트 → 서버)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "계좌 인증 요청")
public class AccountVerificationRequest {

	@NotBlank(message = "계좌번호는 필수입니다")
	@Pattern(regexp = "^\\d{16}$", message = "계좌번호는 16자리 숫자여야 합니다 (하이픈 제외)")
	@Schema(
		description = "계좌번호 (16자리 숫자, 하이픈 제외)",
		example = "0021234567890123",
		required = true
	)
	private String accountNo;

	@NotBlank(message = "인증 코드는 필수입니다")
	@Pattern(regexp = "^\\d{6}$", message = "인증 코드는 6자리 숫자여야 합니다")
	@Schema(
		description = "1원 송금 시 받은 인증 코드 (6자리 숫자)",
		example = "123456",
		required = true
	)
	private String authCode;
}