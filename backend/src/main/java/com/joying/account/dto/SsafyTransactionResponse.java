package com.joying.account.dto;

import com.joying.ssafy.dto.InquireTransactionHistoryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SSAFY 계좌 거래 내역 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SSAFY 계좌 거래 내역 응답")
public class SsafyTransactionResponse {

	@Schema(description = "거래 고유번호", example = "7")
	private String transactionUniqueNo;

	@Schema(description = "거래 일자", example = "20240115")
	private String transactionDate;

	@Schema(description = "거래 시간", example = "153045")
	private String transactionTime;

	@Schema(description = "거래 구분 코드", example = "1")
	private String transactionType;

	@Schema(description = "거래 구분명", example = "입금")
	private String transactionTypeName;

	@Schema(description = "거래 계좌번호", example = "0041234567890123")
	private String transactionAccountNo;

	@Schema(description = "거래 금액", example = "1")
	private Long transactionBalance;

	@Schema(description = "거래 후 잔액", example = "10001")
	private Long transactionAfterBalance;

	@Schema(description = "거래 요약 (입금자명에 인증코드 포함)", example = "JOYING 8212")
	private String transactionSummary;

	@Schema(description = "거래 메모", example = "1원 인증")
	private String transactionMemo;

	@Schema(description = "추출된 인증 코드 (4자리)", example = "8212")
	private String authCode;

	/**
	 * SSAFY API TransactionRec을 SsafyTransactionResponse로 변환
	 *
	 * @param rec SSAFY API TransactionRec
	 * @return SsafyTransactionResponse
	 */
	public static SsafyTransactionResponse from(InquireTransactionHistoryResponse.TransactionRec rec) {
		// transactionSummary에서 인증 코드 추출 (예: "JOYING 8212" -> "8212")
		String authCode = null;
		if (rec.getTransactionSummary() != null && rec.getTransactionSummary().contains("JOYING")) {
			String[] parts = rec.getTransactionSummary().split(" ");
			if (parts.length > 1) {
				authCode = parts[parts.length - 1]; // 마지막 부분이 인증 코드
			}
		}

		return SsafyTransactionResponse.builder()
			.transactionUniqueNo(rec.getTransactionUniqueNo())
			.transactionDate(rec.getTransactionDate())
			.transactionTime(rec.getTransactionTime())
			.transactionType(rec.getTransactionType())
			.transactionTypeName(rec.getTransactionTypeName())
			.transactionAccountNo(rec.getTransactionAccountNo())
			.transactionBalance(rec.getTransactionBalance())
			.transactionAfterBalance(rec.getTransactionAfterBalance())
			.transactionSummary(rec.getTransactionSummary())
			.transactionMemo(rec.getTransactionMemo())
			.authCode(authCode)
			.build();
	}
}