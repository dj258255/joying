package com.joying.account.dto;

import com.joying.account.domain.Account;
import com.joying.account.domain.AccountState;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 계좌 정보 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "계좌 정보 응답")
public class AccountResponse {

	@Schema(description = "계좌 ID", example = "1")
	private Long accountId;

	@Schema(description = "은행 이름", example = "국민은행")
	private String bankName;

	@Schema(description = "은행 코드", example = "004")
	private String bankCode;

	@Schema(description = "계좌 번호 (16자리)", example = "0041234567890123")
	private String accountNo;

	@Schema(description = "예금주명", example = "홍길동")
	private String accountHolderName;

	@Schema(description = "계좌 상태", example = "ACTIVE")
	private AccountState accountState;

	@Schema(description = "계좌 상태 설명", example = "정상")
	private String accountStateDescription;

	@Schema(description = "계좌 사용 가능 여부", example = "true")
	private Boolean isUsable;

	@Schema(description = "계좌 등록 시간 (UTC)", example = "2024-01-15T10:00:00Z")
	private Instant createdAt;

	@Schema(description = "계좌 정보 수정 시간 (UTC)", example = "2024-01-15T10:30:00Z")
	private Instant updatedAt;

	/**
	 * Account 엔티티를 AccountResponse로 변환
	 *
	 * @param account Account 엔티티
	 * @return AccountResponse
	 */
	public static AccountResponse from(Account account) {
		return AccountResponse.builder()
			.accountId(account.getAccountId())
			.bankName(account.getBankName())
			.bankCode(account.getBankCode())
			.accountNo(account.getAccountNo())
			.accountHolderName(account.getAccountHolderName())
			.accountState(account.getAccountState())
			.accountStateDescription(account.getAccountState().getDescription())
			.isUsable(account.isUsable())
			.createdAt(account.getCreatedAt())
			.updatedAt(account.getUpdatedAt())
			.build();
	}
}