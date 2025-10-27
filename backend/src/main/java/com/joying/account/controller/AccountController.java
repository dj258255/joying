package com.joying.account.controller;

import com.joying.account.dto.AccountRealNameRequest;
import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.OpenBankingRealNameResponse;
import com.joying.account.service.AccountService;
import com.joying.account.service.OpenBankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 계좌 컨트롤러 (RESTful 설계)
 *
 * 회원 리소스 하위의 계좌 관리 API 제공
 * - GET    /api/v1/members/{memberId}/accounts              계좌 목록 조회
 * - DELETE /api/v1/members/{memberId}/accounts/{accountId}  계좌 삭제
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "계좌", description = "계좌 등록, 조회, 삭제 API (RESTful)")
public class AccountController {

	private final AccountService accountService;
	private final OpenBankingService openBankingService;

	/**
	 * 회원의 계좌 목록 조회
	 *
	 * @param memberId       조회할 회원 ID
	 * @param authentication Spring Security Authentication
	 * @return 계좌 목록
	 */
	@GetMapping("/api/v1/members/{memberId}/accounts")
	@Operation(
		summary = "회원의 계좌 목록 조회",
		description = """
			특정 회원의 계좌 목록을 조회합니다.

			**권한**: 본인의 계좌만 조회 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**예시**:
			- `GET /api/v1/members/1/accounts` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "403", description = "권한 없음 (본인만 조회 가능)"),
		@ApiResponse(responseCode = "404", description = "회원을 찾을 수 없음")
	})
	public ResponseEntity<List<AccountResponse>> getMemberAccounts(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());

		List<AccountResponse> accounts = accountService.getMemberAccounts(memberId, currentMemberId);

		return ResponseEntity.ok(accounts);
	}

	/**
	 * 계좌 삭제
	 *
	 * @param memberId       회원 ID
	 * @param accountId      계좌 ID
	 * @param authentication Spring Security Authentication
	 * @return 성공 메시지
	 */
	@DeleteMapping("/api/v1/members/{memberId}/accounts/{accountId}")
	@Operation(
		summary = "계좌 삭제",
		description = """
			등록된 계좌를 삭제합니다.

			**권한**: 본인의 계좌만 삭제 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**예시**:
			- `DELETE /api/v1/members/1/accounts/5` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "삭제 성공"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "403", description = "권한 없음 (본인만 삭제 가능)"),
		@ApiResponse(responseCode = "404", description = "회원 또는 계좌를 찾을 수 없음")
	})
	public ResponseEntity<String> deleteAccount(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		@Parameter(description = "계좌 ID", required = true, example = "5")
		@PathVariable Long accountId,
		Authentication authentication
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());

		accountService.deleteAccount(memberId, currentMemberId, accountId);

		return ResponseEntity.ok("계좌가 삭제되었습니다.");
	}

	// ========== 오픈뱅킹 계좌 인증 API (1원 인증) ==========

	/**
	 * 계좌실명조회 (1원 인증)
	 *
	 * @param authentication 인증 정보
	 * @param request        계좌실명조회 요청 (은행코드, 계좌번호, 생년월일)
	 * @return 계좌 인증 결과 및 등록된 계좌 정보
	 */
	@PostMapping("/api/v1/accounts/verify")
	@Operation(
		summary = "계좌 인증 (1원 인증)",
		description = """
			**계좌실명조회를 통한 계좌 인증**

			사용자가 입력한 은행코드, 계좌번호, 생년월일을 통해 계좌실명조회를 수행하고,
			인증에 성공하면 계좌를 등록합니다.

			---

			## 요청 본문

			```json
			{
			  "bankCode": "004",
			  "accountNum": "12345678901234",
			  "accountHolderInfo": "19900101"
			}
			```

			---

			## 처리 과정

			### 1️⃣ 계좌실명조회 API 호출
			```http
			POST https://testapi.openbanking.or.kr/v2.0/inquiry/real_name
			Authorization: Bearer {개발자센터_발급_토큰}
			Content-Type: application/json

			{
			  "bank_tran_id": "M202502623U123456789",
			  "bank_code_std": "004",
			  "account_num": "12345678901234",
			  "account_holder_info": "19900101",
			  "tran_dtime": "20250123151200"
			}
			```

			### 2️⃣ 응답 검증
			```json
			{
			  "rsp_code": "A0000",
			  "rsp_message": "정상처리되었습니다",
			  "bank_name": "국민은행",
			  "account_num_masked": "123******234",
			  "account_holder_name": "홍길동"
			}
			```

			### 3️⃣ 계좌 등록
			- 인증 성공 시 자동으로 계좌 등록
			- verifiedAt에 현재 시각 저장

			---

			## 은행 코드 (bank_code_std)

			| 코드 | 은행명 |
			|-----|--------|
			| 002 | KDB산업은행 |
			| 003 | IBK기업은행 |
			| 004 | KB국민은행 |
			| 007 | 수협은행 |
			| 011 | NH농협은행 |
			| 020 | 우리은행 |
			| 023 | SC제일은행 |
			| 027 | 한국씨티은행 |
			| 031 | 대구은행 |
			| 032 | 부산은행 |
			| 034 | 광주은행 |
			| 035 | 제주은행 |
			| 037 | 전북은행 |
			| 039 | 경남은행 |
			| 045 | 새마을금고 |
			| 048 | 신협 |
			| 050 | 저축은행 |
			| 071 | 우체국 |
			| 081 | KEB하나은행 |
			| 088 | 신한은행 |
			| 089 | K뱅크 |
			| 090 | 카카오뱅크 |
			| 092 | 토스뱅크 |

			---

			## 주의사항

			- **JWT 인증 필요**: Authorization 헤더에 JWT 토큰 필요
			- **개발자센터 토큰**: 오픈뱅킹 개발자센터에서 발급받은 Access Token 필요
			- **중복 방지**: 이미 등록된 계좌는 등록 불가
			- **정확한 정보**: 은행코드, 계좌번호, 생년월일이 모두 일치해야 성공
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "계좌 인증 및 등록 성공"),
		@ApiResponse(responseCode = "400", description = "계좌 인증 실패 (정보 불일치)"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "409", description = "이미 등록된 계좌")
	})
	public ResponseEntity<AccountResponse> verifyAccount(
		Authentication authentication,
		@Valid @RequestBody AccountRealNameRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("=== 계좌 인증 요청 디버깅 ===");
		log.info("Request 객체: {}", request);
		log.info("bankCode: '{}' (null: {})", request.getBankCode(), request.getBankCode() == null);
		log.info("accountNum: '{}' (null: {})", request.getAccountNum(), request.getAccountNum() == null);
		log.info("accountHolderInfo: '{}' (null: {})", request.getAccountHolderInfo(), request.getAccountHolderInfo() == null);
		log.info("============================");
		log.info("계좌 인증 요청: memberId={}, bankCode={}, accountNum={}",
			memberId, request.getBankCode(), request.getAccountNum());

		// 1. 계좌실명조회
		OpenBankingRealNameResponse realNameResponse = openBankingService.verifyAccountRealName(
			request.getBankCode(),
			request.getAccountNum(),
			request.getAccountHolderInfo()
		);

		// 2. 계좌 등록 (인증 성공 시)
		AccountResponse response = accountService.registerAccountFromRealName(memberId, realNameResponse);

		log.info("계좌 인증 및 등록 성공: accountId={}, bankName={}, holderName={}",
			response.getAccountId(), response.getBankName(), response.getAccountHolderName());

		return ResponseEntity.ok(response);
	}
}
