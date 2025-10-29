package com.joying.account.dto;

import com.joying.account.domain.AccountState;
import com.joying.account.domain.SsafyAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 테스트 계좌 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SSAFY 테스트 계좌 응답")
public class SsafyAccountResponse {

	@Schema(description = "SSAFY 계좌 ID", example = "1")
	private Long ssafyAccountId;

	@Schema(description = "상품 고유번호", example = "004-1-001")
	private String accountTypeUniqueNo;

	@Schema(description = "계좌번호 (16자리)", example = "0021234567890123")
	private String accountNo;

	@Schema(description = "은행 코드", example = "004")
	private String bankCode;

	@Schema(description = "계좌 예금주명", example = "홍길동")
	private String accountHolderName;

	@Schema(description = "계좌 상태", example = "ACTIVE")
	private AccountState accountState;

	/**
	 * Entity -> DTO 변환
	 */
	public static SsafyAccountResponse from(SsafyAccount ssafyAccount) {
		return SsafyAccountResponse.builder()
			.ssafyAccountId(ssafyAccount.getSsafyAccountId())
			.accountTypeUniqueNo(ssafyAccount.getAccountTypeUniqueNo())
			.accountNo(ssafyAccount.getAccountNo())
			.bankCode(ssafyAccount.getBankCode())
			.accountHolderName(ssafyAccount.getAccountHolderName())
			.accountState(ssafyAccount.getAccountState())
			.build();
	}
}