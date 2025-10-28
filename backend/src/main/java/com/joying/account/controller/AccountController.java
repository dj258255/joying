package com.joying.account.controller;

import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerificationRequest;
import com.joying.account.dto.AccountVerificationResponse;
import com.joying.account.dto.AccountVerificationStartRequest;
import com.joying.account.dto.AccountVerificationStartResponse;
import com.joying.account.dto.CreateAccountRequest;
import com.joying.account.dto.DemandDepositProductResponse;
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
	name = "계좌",
	description = """
		## 계좌 등록, 조회, 삭제 API (RESTful)

		---

		## 🔐 SSAFY 1원 인증 전체 흐름 (실제 계좌)

		실제 은행 계좌를 1원 인증으로 등록하는 방법입니다.

		### 🚀 1원 인증 순서

		#### 1단계: 1원 송금 시작
		```
		POST /api/v1/accounts/verify/start
		Authorization: Bearer {JWT_TOKEN}

		{
		  "accountNo": "0021234567890123"  // 실제 은행 계좌번호 (16자리)
		}
		```

		✅ **결과**: 해당 계좌로 1원이 송금되며, 입금자명에 **6자리 인증코드** 표시

		#### 2단계: 인증 코드 확인 및 완료
		```
		POST /api/v1/accounts/verify/complete
		Authorization: Bearer {JWT_TOKEN}

		{
		  "accountNo": "0021234567890123",
		  "authCode": "123456"  // 입금자명에서 확인한 6자리 코드
		}
		```

		✅ **결과**: 계좌 인증 완료 + 자동 등록 + 실명 업데이트

		---

		## 🧪 SSAFY 테스트 계좌 생성 흐름 (개발/테스트용)

		실제 계좌가 없을 때, SSAFY 가상 계좌를 만들어 테스트할 수 있습니다.

		#### 1단계: 상품 목록 조회
		```
		GET /api/v1/accounts/products
		```

		✅ **결과**: 수시입출금 상품 목록 조회

		#### 2단계: SSAFY 테스트 계좌 생성
		```
		POST /api/v1/accounts
		Authorization: Bearer {JWT_TOKEN}

		{
		  "accountTypeUniqueNo": "004-1-001"  // 1단계에서 조회한 상품번호
		}
		```

		✅ **결과**: SSAFY 가상 계좌 생성 (16자리 계좌번호 발급)

		#### 3단계: 생성된 계좌로 1원 인증 진행
		- 위의 "1원 인증 순서" 1단계, 2단계와 동일하게 진행

		---

		## ⚠️ 주의사항

		- **API 키 필수**: 환경변수에 `SSAFY_FINANCE_API_KEY` 설정 필요
		- **JWT 필수**: 모든 API는 로그인 후 사용 가능 (상품 조회 제외)
		- **5분 제한**: 1원 송금 후 5분 이내에 인증 코드 입력 필요
		- **중복 방지**: 이미 등록된 계좌는 재등록 불가
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

	// ========== SSAFY 금융망 상품 및 계좌 생성 API ==========

	/**
	 * 수시입출금 상품 목록 조회
	 *
	 * @return 상품 목록
	 */
	@GetMapping("/api/v1/accounts/products")
	@Operation(
		summary = "수시입출금 상품 목록 조회",
		description = """
			**SSAFY 금융망 수시입출금 상품 목록 조회**

			SSAFY 계좌를 생성하기 위해 먼저 상품 목록을 조회합니다.

			---

			## 응답 예시

			```json
			[
			  {
			    "bankCode": "004",
			    "bankName": "국민은행",
			    "accountTypeUniqueNo": "004-1-001",
			    "accountTypeName": "KB자유입출금",
			    "accountDescription": "자유롭게 입출금 가능한 통장"
			  }
			]
			```

			---

			## 주의사항

			- 로그인 불필요 (공개 API)
			- SSAFY 테스트 계좌 생성용 상품 목록
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

	/**
	 * SSAFY 수시입출금 계좌 생성
	 *
	 * @param authentication 인증 정보
	 * @param request        계좌 생성 요청
	 * @return 생성된 계좌 정보
	 */
	@PostMapping("/api/v1/accounts")
	@Operation(
		summary = "SSAFY 수시입출금 계좌 생성",
		description = """
			**SSAFY 금융망에서 테스트 계좌 생성**

			수시입출금 상품을 선택하여 SSAFY 테스트 계좌를 생성합니다.
			생성된 계좌로 1원 인증을 진행할 수 있습니다.

			---

			## 요청 본문

			```json
			{
			  "accountTypeUniqueNo": "004-1-001"
			}
			```

			---

			## 처리 과정

			### 1️⃣ SSAFY 회원 확인
			- SSAFY userKey가 없으면 자동으로 회원 등록 및 userKey 발급

			### 2️⃣ 계좌 생성 (createDemandDepositAccount)
			```http
			POST https://finopenapi.ssafy.io/createDemandDepositAccount
			Content-Type: application/json

			{
			  "Header": {
			    "apiName": "createDemandDepositAccount",
			    "userKey": "f1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
			    ...
			  },
			  "accountTypeUniqueNo": "004-1-001"
			}
			```

			### 3️⃣ 계좌 저장
			- 생성된 SSAFY 계좌를 DB에 저장
			- 이후 1원 인증 가능

			---

			## 주의사항

			- **JWT 인증 필요**: Authorization 헤더에 JWT 토큰 필요
			- **SSAFY 테스트 계좌**: 교육용 가상 계좌 (실제 은행 계좌 아님)
			- **1원 인증 필수**: 생성 후 1원 인증을 통해 실명 확인 필요
			"""
	)
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "계좌 생성 성공"),
		@ApiResponse(responseCode = "400", description = "잘못된 상품 번호"),
		@ApiResponse(responseCode = "401", description = "인증 실패 (로그인 필요)"),
		@ApiResponse(responseCode = "500", description = "SSAFY 금융망 오류")
	})
	public ResponseEntity<AccountResponse> createAccount(
		Authentication authentication,
		@Valid @RequestBody CreateAccountRequest request
	) {
		Long memberId = Long.parseLong(authentication.getName());
		log.info("SSAFY 계좌 생성 요청: memberId={}, accountTypeUniqueNo={}",
			memberId, request.getAccountTypeUniqueNo());

		AccountResponse response = accountService.createDemandDepositAccount(
			memberId,
			request.getAccountTypeUniqueNo()
		);

		log.info("SSAFY 계좌 생성 성공: accountId={}, accountNo={}",
			response.getAccountId(), response.getAccountNo());

		return ResponseEntity.ok(response);
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
			**SSAFY 금융망 1원 인증 - 1단계: 1원 송금**

			사용자가 입력한 계좌번호로 1원을 송금하여 인증을 시작합니다.
			입금자명에 표시된 6자리 인증 코드를 확인해야 합니다.

			---

			## 요청 본문

			```json
			{
			  "accountNo": "0021234567890123"
			}
			```

			---

			## 처리 과정

			### 1️⃣ SSAFY 회원 확인
			- SSAFY userKey가 없으면 자동으로 회원 등록 및 userKey 발급
			- 이미 userKey가 있으면 바로 1원 송금 진행

			### 2️⃣ 1원 송금 (openAccountAuth)
			```http
			POST https://finopenapi.ssafy.io/openAccountAuth
			Content-Type: application/json

			{
			  "Header": {
			    "apiName": "openAccountAuth",
			    "userKey": "f1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
			    ...
			  },
			  "accountNo": "0021234567890123",
			  "authText": "JOYING"
			}
			```

			### 3️⃣ 응답
			```json
			{
			  "accountNo": "0021234567890123",
			  "message": "1원이 송금되었습니다. 입금자명에 표시된 6자리 인증 코드를 입력해주세요."
			}
			```

			---

			## 주의사항

			- **JWT 인증 필요**: Authorization 헤더에 JWT 토큰 필요
			- **계좌번호 형식**: 16자리 숫자 (은행코드 포함)
			- **인증 코드 확인**: 계좌 거래 내역에서 "JOYING" 입금자명으로 확인
			- **5분 이내**: 인증 코드는 5분 이내에 입력해야 함
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
			**SSAFY 금융망 1원 인증 - 2단계: 인증 코드 확인**

			사용자가 입력한 인증 코드를 검증하고, 계좌를 등록합니다.

			---

			## 요청 본문

			```json
			{
			  "accountNo": "0021234567890123",
			  "authCode": "123456"
			}
			```

			---

			## 처리 과정

			### 1️⃣ 인증 코드 검증 (checkAuthCode)
			```http
			POST https://finopenapi.ssafy.io/checkAuthCode
			Content-Type: application/json

			{
			  "Header": {
			    "apiName": "checkAuthCode",
			    "userKey": "f1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
			    ...
			  },
			  "accountNo": "0021234567890123",
			  "authText": "JOYING",
			  "authCode": "123456"
			}
			```

			### 2️⃣ 응답 검증
			```json
			{
			  "REC": {
			    "accountNo": "0021234567890123",
			    "userName": "홍길동",
			    "bankCode": "002",
			    "bankName": "산업은행",
			    "authStatus": "SUCCESS"
			  }
			}
			```

			### 3️⃣ 계좌 등록
			- 인증 성공 시 자동으로 계좌 등록
			- 회원 실명 업데이트 (최초 1회)
			- verifiedAt에 현재 시각 저장

			---

			## 주의사항

			- **JWT 인증 필요**: Authorization 헤더에 JWT 토큰 필요
			- **중복 방지**: 이미 등록된 계좌는 등록 불가
			- **정확한 코드**: 인증 코드가 일치해야 성공
			- **3회 제한**: 3회 이상 실패 시 일시적으로 인증 제한
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
			request.getAuthCode()
		);

		log.info("1원 인증 완료 성공: memberId={}, accountNo={}, realName={}",
			memberId, response.getAccountNo(), response.getRealName());

		return ResponseEntity.ok(response);
	}
}
