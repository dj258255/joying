package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 테스트 계좌 생성 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SSAFY 테스트 계좌 생성 요청")
public class CreateSsafyAccountRequest {

	@NotBlank(message = "상품 고유번호는 필수입니다")
	@Schema(
		description = "수시입출금 상품 고유번호",
		example = "004-1-001",
		required = true
	)
	private String accountTypeUniqueNo;
}
