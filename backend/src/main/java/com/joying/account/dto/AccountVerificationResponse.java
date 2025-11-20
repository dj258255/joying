package com.joying.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계좌 인증 완료 응답 (서버 → 클라이언트)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "계좌 인증 완료 응답")
public class AccountVerificationResponse {

	@Schema(description = "계좌번호", example = "0021234567890123")
	private String accountNo;

	@Schema(description = "실명 (1원 인증으로 확인된 이름)", example = "홍길동")
	private String realName;

	@Schema(description = "인증 완료 여부", example = "true")
	private Boolean verified;

	@Schema(description = "안내 메시지", example = "계좌 인증이 완료되었습니다.")
	private String message;
}