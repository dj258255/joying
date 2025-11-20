package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수시입출금 상품 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "수시입출금 상품 정보")
public class DemandDepositProductResponse {

	@Schema(description = "은행 코드", example = "004")
	private String bankCode;

	@Schema(description = "은행명", example = "국민은행")
	private String bankName;

	@Schema(description = "상품 고유번호", example = "004-1-001")
	private String accountTypeUniqueNo;

	@Schema(description = "상품명", example = "KB자유입출금")
	private String accountTypeName;

	@Schema(description = "상품 설명", example = "자유롭게 입출금 가능한 통장")
	private String accountDescription;
}
