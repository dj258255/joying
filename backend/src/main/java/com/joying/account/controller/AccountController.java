package com.joying.account.controller;

import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerificationRequest;
import com.joying.account.dto.AccountVerificationResponse;
import com.joying.account.dto.AccountVerificationStartRequest;
import com.joying.account.dto.AccountVerificationStartResponse;
import com.joying.account.dto.DemandDepositProductResponse;
import com.joying.account.dto.SsafyTransactionResponse;
import com.joying.account.service.AccountService;
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
@Tag(
	name = "계좌 인증",
	description = """
		1원 인증이 완료된 계좌를 조회하고 관리합니다.

		## 전체 흐름

		1. 상품 목록 조회: GET /api/v1/accounts/products
		2. SSAFY 테스트 계좌 생성: POST /api/v1/ssafy-accounts
		3. 1원 인증 시작: POST /api/v1/accounts/verify/start
		4. 거래내역 조회 (인증코드 확인): GET /api/v1/accounts/transactions
		5. 1원 인증 완료: POST /api/v1/accounts/verify/complete

		## 계좌 테이블 분리

		- ssafy_account: SSAFY API로 생성한 테스트 계좌 (1원 인증 전)
		- account: 1원 인증 완료 계좌 (송금/결제 사용)

		## 주의사항

		- SSAFY에서 생성한 테스트 계좌로만 1원 인증 가능
		- 1원 송금 후 5분 이내 인증 코드 입력 필요
		- JWT 인증 필수 (상품 조회 제외)
		"""
)
public class AccountController {

	private final AccountService accountService;

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

	// ========== SSAFY 금융망 상품 조회 API ==========

	/**
	 * 수시입출금 상품 목록 조회
	 *
	 * @return 상품 목록
	 */
	@GetMapping("/api/v1/accounts/products")
	@Operation(
		summary = "수시입출금 상품 목록 조회",
		description = """
			SSAFY 테스트 계좌 생성을 위한 수시입출금 상품 목록을 조회합니다.

			로그인 불필요 (공개 API)
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(responseCode = "500", description = "SSAFY 금융망 오류")
	})
	public ResponseEntity<List<DemandDepositProductResponse>> getDemandDepositProducts() {
		log.info("수시입출금 상품 목록 조회 요청");

		List<DemandDepositProductResponse> products = accountService.getDemandDepositProducts();

		log.info("수시입출금 상품 목록 조회 성공: 총 {}개", products.size());

		return ResponseEntity.ok(products);
	}

	// ========== SSAFY 금융망 계좌 인증 API (1원 인증) ==========

	/**
	 * 1원 인증 시작 (1원 송금)
	 *
	 * @param authentication 인증 정보
	 * @param request        계좌번호
	 * @return 인증 시작 응답
	 */
	@PostMapping("/api/v1/accounts/verify/start")
	@Operation(
		summary = "1원 인증 시작",
		description = """
			계좌번호로 1원을 송금하여 인증을 시작합니다.

			## 처리 과정

			1. SSAFY userKey 확인 (없으면 자동 등록)
			2. 계좌로 1원 송금
			3. transactionUniqueNo 반환 (거래내역 조회 시 사용)

			## 응답 데이터

			- accountNo: 계좌번호
			- transactionUniqueNo: 거래 고유번호 (거래내역 조회 API에 사용)
			- message: 안내 메시지

			## 주의사항

			- SSAFY 테스트 계좌만 가능
			- JWT 인증 필수
			- 5분 이내 인증 코드 입력 필요
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "1원 송금 성공"),
		@ApiResponse(responseCode = "400", description = "계좌번호 형식 오류"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "500", description = "SSAFY 금융망 오류")
	})
	public ResponseEntity<AccountVerificationStartResponse> startAccountVerification(
		Authentication authentication,
		@Valid @RequestBody AccountVerificationStartRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("1원 인증 시작 요청: memberId={}, accountNo={}", memberId, request.getAccountNo());

		AccountVerificationStartResponse response = accountService.startAccountVerification(
			memberId,
			request.getAccountNo()
		);

		log.info("1원 인증 시작 성공: memberId={}, accountNo={}", memberId, request.getAccountNo());

		return ResponseEntity.ok(response);
	}

	/**
	 * 1원 인증 확인 (authCode 검증 및 계좌 등록)
	 *
	 * @param authentication 인증 정보
	 * @param request        계좌번호 + 인증 코드
	 * @return 인증 결과 및 등록된 계좌 정보
	 */
	@PostMapping("/api/v1/accounts/verify/complete")
	@Operation(
		summary = "1원 인증 완료",
		description = """
			인증 코드를 검증하고 계좌를 등록합니다.

			## 처리 과정

			1. 인증 코드 검증
			2. 계좌 자동 등록
			3. 회원 실명 업데이트 (최초 1회)

			## 주의사항

			- JWT 인증 필수
			- 중복 계좌 등록 불가
			- 인증 코드 일치 필수
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "계좌 인증 및 등록 성공"),
		@ApiResponse(responseCode = "400", description = "인증 코드 불일치"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "409", description = "이미 등록된 계좌")
	})
	public ResponseEntity<AccountVerificationResponse> completeAccountVerification(
		Authentication authentication,
		@Valid @RequestBody AccountVerificationRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("1원 인증 완료 요청: memberId={}, accountNo={}, authCode={}",
			memberId, request.getAccountNo(), request.getAuthCode());

		AccountVerificationResponse response = accountService.completeAccountVerification(
			memberId,
			request.getAccountNo(),
			request.getAuthCode(),
			request.getAccountHolderName()
		);

		log.info("1원 인증 완료 성공: memberId={}, accountNo={}, realName={}",
			memberId, response.getAccountNo(), response.getRealName());

		return ResponseEntity.ok(response);
	}

	/**
	 * SSAFY 계좌 거래 내역 조회 (1원 인증 코드 확인용)
	 *
	 * @param authentication      인증 정보
	 * @param accountNo           계좌번호
	 * @param transactionUniqueNo 거래 고유번호
	 * @return 거래 내역 (인증 코드 포함)
	 */
	@GetMapping("/api/v1/accounts/transactions")
	@Operation(
		summary = "SSAFY 계좌 거래 내역 조회",
		description = """
			거래 내역을 조회하여 1원 인증 코드를 확인합니다.

			## 응답 데이터

			- transactionSummary: 입금자명 (예: "JOYING 8212")
			- authCode: 자동 추출된 인증 코드 (예: "8212")

			## 주의사항

			- JWT 인증 필수
			- SSAFY 테스트 계좌만 가능
			- transactionUniqueNo는 1원 송금 시 응답으로 받음
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "404", description = "거래 내역을 찾을 수 없음"),
		@ApiResponse(responseCode = "500", description = "SSAFY 금융망 오류")
	})
	public ResponseEntity<SsafyTransactionResponse> getTransactionHistory(
		Authentication authentication,
		@Parameter(description = "계좌번호 (16자리)", required = true, example = "0041234567890123")
		@RequestParam String accountNo,
		@Parameter(description = "거래 고유번호", required = true, example = "7")
		@RequestParam String transactionUniqueNo
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("거래 내역 조회 요청: memberId={}, accountNo={}, transactionUniqueNo={}",
			memberId, accountNo, transactionUniqueNo);

		SsafyTransactionResponse response = accountService.getTransactionHistory(
			memberId,
			accountNo,
			transactionUniqueNo
		);

		log.info("거래 내역 조회 성공: memberId={}, authCode={}", memberId, response.getAuthCode());

		return ResponseEntity.ok(response);
	}
}
