package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 1원 인증 시작 응답 (서버 → 클라이언트)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "1원 인증 시작 응답")
public class AccountVerificationStartResponse {

	@Schema(description = "계좌번호", example = "0021234567890123")
	private String accountNo;

	@Schema(description = "거래 고유번호 (거래내역 조회 시 사용)", example = "7")
	private String transactionUniqueNo;

	@Schema(description = "안내 메시지", example = "1원이 송금되었습니다. 입금자명에 표시된 4자리 인증 코드를 입력해주세요.")
	private String message;
}