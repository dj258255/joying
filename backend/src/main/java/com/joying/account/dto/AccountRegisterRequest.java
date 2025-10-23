package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌 등록 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "계좌 등록 요청")
public class AccountRegisterRequest {

	@NotBlank(message = "은행 이름은 필수입니다.")
	@Schema(description = "은행 이름", example = "국민은행")
	private String bankName;

	@NotBlank(message = "계좌 번호는 필수입니다.")
	@Schema(description = "계좌 번호", example = "123-456-7890")
	private String accountNum;
}