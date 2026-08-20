package com.joying.account.controller;

import com.joying.account.dto.CreateSsafyAccountRequest;
import com.joying.account.dto.SsafyAccountResponse;
import com.joying.account.service.SsafyAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SSAFY 테스트 계좌 컨트롤러
 *
 * SSAFY 금융망 API를 통한 테스트 계좌 생성 및 관리
 */
@Slf4j
@ConditionalOnProperty(name = "joying.money.transfer", havingValue = "ssafy")
@RestController
@RequestMapping("/api/v1/ssafy-accounts")
@RequiredArgsConstructor
@Tag(
	name = "SSAFY 테스트 계좌",
	description = """
		## 🧪 SSAFY 테스트 계좌 관리 API

		**SSAFY 금융망에서 제공하는 테스트 계좌를 생성하고 관리합니다.**

		### 📌 주요 기능
		1. **SSAFY 테스트 계좌 생성**: 수시입출금 상품을 선택하여 SSAFY 테스트 계좌 생성
		2. **SSAFY 계좌 목록 조회**: 내가 생성한 SSAFY 테스트 계좌 목록 확인
		3. **SSAFY 계좌 삭제**: 더 이상 사용하지 않는 테스트 계좌 삭제

		### 🔄 SSAFY 계좌 vs 인증된 계좌
		- **SSAFY 계좌** (`/api/v1/ssafy-accounts`): SSAFY 금융망에서 생성한 테스트 계좌 (1원 인증 전)
		- **인증된 계좌** (`/api/v1/accounts`): 1원 인증이 완료된 계좌 (실제 송금/결제에 사용)

		### 💡 사용 흐름
		```
		1. SSAFY 계좌 생성 (POST /api/v1/ssafy-accounts)
		   → accountTypeUniqueNo: "004-1-001"

		2. SSAFY 계좌 목록 조회 (GET /api/v1/ssafy-accounts)
		   → 생성된 계좌번호 확인

		3. 1원 인증 시작 (POST /api/v1/accounts/verify/start)
		   → SSAFY 계좌번호 입력

		4. 1원 인증 완료 (POST /api/v1/accounts/verify/complete)
		   → 인증된 계좌로 등록 (Account 테이블)
		```
		"""
)
public class SsafyAccountController {

	private final SsafyAccountService ssafyAccountService;

	/**
	 * SSAFY 테스트 계좌 생성
	 */
	@PostMapping
	@Operation(
		summary = "SSAFY 테스트 계좌 생성",
		description = """
			SSAFY 금융망 API를 통해 테스트 계좌를 생성합니다.

			**주의사항:**
			- SSAFY 금융망에 회원 등록이 안 되어 있으면 자동으로 등록됩니다 (userKey 발급)
			- 생성된 계좌는 1원 인증을 통해 인증된 계좌로 등록할 수 있습니다
			- 수시입출금 상품 목록은 `GET /api/v1/accounts/products` 에서 조회 가능

			**요청 예시:**
			```json
			{
			  "accountTypeUniqueNo": "004-1-001"
			}
			```
			"""
	)
	@ApiResponses({
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "201",
			description = "SSAFY 계좌 생성 성공",
			content = @Content(
				mediaType = "application/json",
				schema = @Schema(implementation = SsafyAccountResponse.class),
				examples = @ExampleObject(
					value = """
						{
						  "ssafyAccountId": 1,
						  "accountTypeUniqueNo": "004-1-001",
						  "accountNo": "0041234567890123",
						  "bankCode": "004",
						  "accountHolderName": "홍길동",
						  "accountState": "ACTIVE"
						}
						"""
				)
			)
		),
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "400",
			description = "잘못된 요청 (상품 고유번호 누락 등)"
		),
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "409",
			description = "이미 등록된 계좌"
		)
	})
	@ResponseStatus(HttpStatus.CREATED)
	public ResponseEntity<SsafyAccountResponse> createSsafyAccount(
		Authentication authentication,
		@Valid @RequestBody CreateSsafyAccountRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());

		log.info("SSAFY 계좌 생성 요청: memberId={}, accountTypeUniqueNo={}",
			memberId, request.getAccountTypeUniqueNo());

		SsafyAccountResponse response = ssafyAccountService.createSsafyAccount(
			memberId,
			request.getAccountTypeUniqueNo()
		);

		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	/**
	 * 내 SSAFY 계좌 목록 조회
	 */
	@GetMapping
	@Operation(
		summary = "내 SSAFY 계좌 목록 조회",
		description = """
			현재 로그인한 회원의 SSAFY 테스트 계좌 목록을 조회합니다.

			**응답 예시:**
			```json
			[
			  {
			    "ssafyAccountId": 1,
			    "accountTypeUniqueNo": "004-1-001",
			    "accountNo": "0041234567890123",
			    "bankCode": "004",
			    "accountHolderName": "홍길동",
			    "accountState": "ACTIVE"
			  },
			  {
			    "ssafyAccountId": 2,
			    "accountTypeUniqueNo": "004-1-002",
			    "accountNo": "0041234567890456",
			    "bankCode": "004",
			    "accountHolderName": "홍길동",
			    "accountState": "ACTIVE"
			  }
			]
			```
			"""
	)
	@ApiResponses({
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "200",
			description = "조회 성공"
		)
	})
	public ResponseEntity<List<SsafyAccountResponse>> getMySsafyAccounts(
		Authentication authentication
	) {
		Long memberId = Long.parseLong(authentication.getName());

		log.info("SSAFY 계좌 목록 조회: memberId={}", memberId);

		List<SsafyAccountResponse> accounts = ssafyAccountService.getMemberSsafyAccounts(
			memberId,
			memberId
		);

		return ResponseEntity.ok(accounts);
	}

	/**
	 * SSAFY 계좌 삭제
	 */
	@DeleteMapping("/{ssafyAccountId}")
	@Operation(
		summary = "SSAFY 계좌 삭제",
		description = """
			SSAFY 테스트 계좌를 삭제합니다.

			**주의사항:**
			- 본인의 계좌만 삭제 가능
			- 이미 1원 인증이 완료된 계좌는 `/api/v1/accounts` 에서 관리
			"""
	)
	@ApiResponses({
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "200",
			description = "삭제 성공"
		),
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "403",
			description = "권한 없음 (다른 사람의 계좌)"
		),
		@io.swagger.v3.oas.annotations.responses.ApiResponse(
			responseCode = "404",
			description = "계좌를 찾을 수 없음"
		)
	})
	public ResponseEntity<String> deleteSsafyAccount(
		Authentication authentication,
		@Parameter(description = "SSAFY 계좌 ID", example = "1")
		@PathVariable Long ssafyAccountId
	) {
		Long memberId = Long.parseLong(authentication.getName());

		log.info("SSAFY 계좌 삭제 요청: memberId={}, ssafyAccountId={}",
			memberId, ssafyAccountId);

		ssafyAccountService.deleteSsafyAccount(
			memberId,
			memberId,
			ssafyAccountId
		);

		return ResponseEntity.ok("계좌가 삭제되었습니다.");
	}
}