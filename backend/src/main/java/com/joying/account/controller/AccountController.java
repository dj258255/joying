package com.joying.account.controller;

import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerifyRequest;
import com.joying.account.dto.OpenBankingAccountListResponse;
import com.joying.account.dto.OpenBankingTokenResponse;
import com.joying.account.service.AccountService;
import com.joying.account.service.OpenBankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.List;

/**
 * 계좌 컨트롤러
 *
 * 계좌 등록, 조회, 삭제 API 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "계좌", description = "계좌 등록, 조회, 삭제 API")
public class AccountController {

	private final AccountService accountService;
	private final OpenBankingService openBankingService;

	/**
	 * 내 계좌 목록 조회
	 *
	 * @param authentication Spring Security Authentication
	 * @return 계좌 목록
	 */
	@GetMapping("/me")
	@Operation(summary = "내 계좌 목록 조회", description = "현재 로그인한 사용자의 계좌 목록 조회")
	public ResponseEntity<List<AccountResponse>> getMyAccounts(Authentication authentication) {
		Long memberId = Long.parseLong(authentication.getName());

		List<AccountResponse> accounts = accountService.getMyAccounts(memberId);

		return ResponseEntity.ok(accounts);
	}

	/**
	 * 계좌 삭제
	 *
	 * @param authentication Spring Security Authentication
	 * @param accountId      계좌 ID
	 * @return 성공 메시지
	 */
	@DeleteMapping("/{accountId}")
	@Operation(summary = "계좌 삭제", description = "등록된 계좌 삭제")
	public ResponseEntity<String> deleteAccount(Authentication authentication,
	                                            @PathVariable Long accountId) {
		Long memberId = Long.parseLong(authentication.getName());

		accountService.deleteAccount(memberId, accountId);

		return ResponseEntity.ok("계좌가 삭제되었습니다.");
	}

	// ========== 오픈뱅킹 계좌 인증 API ==========

	/**
	 * 계좌 인증 시작 (오픈뱅킹 인증 페이지로 리다이렉트)
	 *
	 * @param authentication 인증 정보
	 * @return 오픈뱅킹 인증 페이지 리다이렉트
	 */
	@GetMapping("/verify/start")
	@Operation(summary = "계좌 인증 시작", description = "오픈뱅킹 인증 페이지로 리다이렉트합니다")
	public RedirectView startVerification(Authentication authentication) {
		Long memberId = Long.parseLong(authentication.getName());
		// state에 memberId 전달 (CSRF 방지)
		String authUrl = openBankingService.getAuthorizationUrl(String.valueOf(memberId));

		log.info("계좌 인증 시작: memberId={}, authUrl={}", memberId, authUrl);
		return new RedirectView(authUrl);
	}

	/**
	 * 오픈뱅킹 OAuth 콜백
	 *
	 * @param code  Authorization Code
	 * @param state 회원 ID
	 * @return 인증 결과 페이지로 리다이렉트
	 */
	@GetMapping("/verify/callback")
	@Operation(summary = "오픈뱅킹 OAuth 콜백", description = "오픈뱅킹 인증 후 콜백 처리")
	public RedirectView oauthCallback(
		@Parameter(description = "Authorization Code") @RequestParam String code,
		@Parameter(description = "회원 ID") @RequestParam String state
	) {
		try {
			Long memberId = Long.parseLong(state);
			log.info("오픈뱅킹 콜백 수신: memberId={}, code={}", memberId, code);

			// 1. Access Token 발급
			OpenBankingTokenResponse tokenResponse = openBankingService.getAccessToken(code);

			// 2. 계좌 목록 조회
			OpenBankingAccountListResponse accountList = openBankingService.getAccountList(
				tokenResponse.getAccessToken(),
				tokenResponse.getUserSeqNo()
			);

			// 3. 프론트엔드로 리다이렉트 (계좌 선택 페이지)
			String redirectUrl = String.format(
				"http://localhost:3000/accounts/select?userSeqNo=%s&accessToken=%s&accountCount=%d",
				tokenResponse.getUserSeqNo(),
				tokenResponse.getAccessToken(),
				accountList.getResCnt()
			);

			return new RedirectView(redirectUrl);

		} catch (Exception e) {
			log.error("오픈뱅킹 콜백 처리 실패", e);
			return new RedirectView("http://localhost:3000/accounts/error?message=" + e.getMessage());
		}
	}

	/**
	 * 계좌 인증 완료 (선택한 계좌 저장)
	 *
	 * @param authentication 인증 정보
	 * @param request        계좌 인증 요청
	 * @return 저장된 계좌 정보
	 */
	@PostMapping("/verify/complete")
	@Operation(summary = "계좌 인증 완료", description = "선택한 계좌를 저장합니다")
	public ResponseEntity<AccountResponse> completeVerification(
		Authentication authentication,
		@Valid @RequestBody AccountVerifyRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("계좌 인증 완료 요청: memberId={}, fintechUseNum={}", memberId, request.getFintechUseNum());

		AccountResponse response = accountService.verifyAndRegisterAccount(memberId, request);

		return ResponseEntity.ok(response);
	}
}