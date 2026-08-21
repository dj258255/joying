package com.joying.ssafy.service;

import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.ssafy.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SSAFY 금융망 API 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinanceApiService {

	private final FinanceApiProperties financeApiProperties;
	private final RestTemplate financeApiRestTemplate;

	/**
	 * SSAFY 금융망 회원 조회
	 *
	 * @param userId 조회할 사용자 ID (이메일 형식)
	 * @return 사용자 정보 (userKey 포함)
	 */
	public MemberRegisterResponse searchMember(String userId) {
		String url = financeApiProperties.getBaseUrl() + "/ssafy/api/v1/member/search";

		// Request 생성
		MemberSearchRequest request = MemberSearchRequest.builder()
			.apiKey(financeApiProperties.getApiKey())
			.userId(userId)
			.build();

		log.info("SSAFY 회원 조회 요청: userId={}", userId);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<MemberSearchRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<MemberRegisterResponse> response = financeApiRestTemplate.postForEntity(
				url,
				entity,
				MemberRegisterResponse.class
			);

			MemberRegisterResponse responseBody = response.getBody();

			if (responseBody == null) {
				log.error("SSAFY 회원 조회 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			log.info("SSAFY 회원 조회 성공: userId={}, userName={}, userKey={}",
				responseBody.getUserId(), responseBody.getUserName(), responseBody.getUserKey());

			return responseBody;

		} catch (Exception e) {
			log.error("SSAFY 회원 조회 API 호출 중 오류 발생: userId={}", userId, e);
			// E4003: 존재하지 않는 ID입니다
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}
	}

	/**
	 * SSAFY 금융망 회원 등록 (USER KEY 자동 발급)
	 *
	 * @param userId 사용자 ID (이메일 형식)
	 * @return 회원 정보 (userKey, userName 포함)
	 */
	public MemberRegisterResponse registerMember(String userId) {
		String url = financeApiProperties.getBaseUrl() + "/ssafy/api/v1/member";

		// Request 생성
		MemberRegisterRequest request = MemberRegisterRequest.builder()
			.apiKey(financeApiProperties.getApiKey())
			.userId(userId)
			.build();

		log.info("SSAFY 회원 등록 요청: userId={}", userId);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<MemberRegisterRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<MemberRegisterResponse> response = financeApiRestTemplate.postForEntity(
				url,
				entity,
				MemberRegisterResponse.class
			);

			MemberRegisterResponse responseBody = response.getBody();

			if (responseBody == null) {
				log.error("SSAFY 회원 등록 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			String userKey = responseBody.getUserKey();
			log.info("SSAFY 회원 등록 성공: userId={}, userName={}, userKey={}",
				responseBody.getUserId(), responseBody.getUserName(), userKey);

			// 전체 응답 반환 (userKey, userName 포함)
			return responseBody;

		} catch (HttpClientErrorException.BadRequest e) {
			// E4002: 이미 존재하는 ID입니다 - 기존 회원 조회로 userKey 가져오기
			String errorBody = e.getResponseBodyAsString();
			log.warn("SSAFY 회원 등록 실패 (이미 존재하는 사용자일 수 있음): userId={}, error={}", userId, errorBody);

			if (errorBody.contains("E4002") || errorBody.contains("이미 존재하는 ID")) {
				log.info("기존 SSAFY 회원 조회 시도: userId={}", userId);
				try {
					// 기존 회원 정보 조회
					return searchMember(userId);
				} catch (Exception searchException) {
					log.error("기존 SSAFY 회원 조회 실패: userId={}", userId, searchException);
					throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
				}
			}

			log.error("SSAFY 회원 등록 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);

		} catch (Exception e) {
			log.error("SSAFY 회원 등록 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * 1원 송금 (계좌 인증 시작)
	 *
	 * API는 authCode를 직접 반환하지 않습니다.
	 * 사용자는 계좌 거래내역에서 "JOYING {4자리숫자}" 형식의 입금자명을 확인해야 합니다.
	 *
	 * @param accountNo 계좌번호 (16자리)
	 * @param userKey   사용자 KEY
	 * @return 거래 고유번호
	 */
	public String openAccountAuth(String accountNo, String userKey) {
		String apiName = "openAccountAuth";
		String authText = "JOYING"; // 서비스명

		// Header 생성
		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			userKey,
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		OpenAccountAuthRequest request = OpenAccountAuthRequest.builder()
			.header(header)
			.accountNo(accountNo)
			.authText(authText)
			.build();

		log.info("1원 송금 요청: accountNo={}, userKey={}", accountNo, userKey);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<OpenAccountAuthRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<OpenAccountAuthResponse> response = financeApiRestTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/accountAuth/" + apiName,
				entity,
				OpenAccountAuthResponse.class
			);

			OpenAccountAuthResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getHeader() == null) {
				log.error("1원 송금 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("1원 송금 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
			}

			String transactionUniqueNo = responseBody.getRec().getTransactionUniqueNo();
			log.info("1원 송금 성공: accountNo={}, transactionUniqueNo={}", accountNo, transactionUniqueNo);

			return transactionUniqueNo;

		} catch (Exception e) {
			log.error("1원 송금 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}
	}

	/**
	 * 1원 인증 확인
	 *
	 * @param accountNo 계좌번호 (16자리)
	 * @param authCode  인증 코드 (4자리)
	 * @param userKey   사용자 KEY
	 * @return 인증 결과 (status, transactionUniqueNo, accountNo)
	 */
	public CheckAuthCodeResponse.CheckAuthCodeRec checkAuthCode(String accountNo, String authCode, String userKey) {
		String apiName = "checkAuthCode";
		String authText = "JOYING"; // 서비스명

		// Header 생성
		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			userKey,
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		CheckAuthCodeRequest request = CheckAuthCodeRequest.builder()
			.header(header)
			.accountNo(accountNo)
			.authText(authText)
			.authCode(authCode)
			.build();

		log.info("1원 인증 확인 요청: accountNo={}, authCode={}, userKey={}", accountNo, authCode, userKey);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<CheckAuthCodeRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<CheckAuthCodeResponse> response = financeApiRestTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/accountAuth/" + apiName,
				entity,
				CheckAuthCodeResponse.class
			);

			CheckAuthCodeResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getHeader() == null) {
				log.error("1원 인증 확인 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("1원 인증 확인 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
			}

			// 인증 상태 확인
			CheckAuthCodeResponse.CheckAuthCodeRec rec = responseBody.getRec();
			if (!"SUCCESS".equals(rec.getStatus())) {
				log.error("1원 인증 실패: status={}",
					rec.getStatus());
				throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
			}

			log.info("1원 인증 성공: accountNo={}, status={}, transactionUniqueNo={}",
				accountNo, rec.getStatus(), rec.getTransactionUniqueNo());

			return rec; // 전체 결과 반환 (status, transactionUniqueNo, accountNo)

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("1원 인증 확인 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}
	}

	/**
	 * 수시입출금 상품 목록 조회
	 *
	 * @return 수시입출금 상품 목록
	 */
	public InquireDemandDepositListResponse inquireDemandDepositList() {
		String apiName = "inquireDemandDepositList";

		// Header 생성 (userKey 불필요)
		SsafyApiHeader header = SsafyApiHeader.createRequestHeader(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		InquireDemandDepositListRequest request = InquireDemandDepositListRequest.builder()
			.header(header)
			.build();

		String requestUrl = financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName;
		log.info("수시입출금 상품 목록 조회 요청 - URL: {}", requestUrl);
		log.info("수시입출금 상품 목록 조회 요청 - API Key: {}", financeApiProperties.getApiKey());
		log.info("수시입출금 상품 목록 조회 요청 - Header: {}", header);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<InquireDemandDepositListRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<InquireDemandDepositListResponse> response = financeApiRestTemplate.postForEntity(
				requestUrl,
				entity,
				InquireDemandDepositListResponse.class
			);

			InquireDemandDepositListResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getHeader() == null) {
				log.error("수시입출금 상품 목록 조회 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("수시입출금 상품 목록 조회 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			log.info("수시입출금 상품 목록 조회 성공: 총 {}개",
				responseBody.getRec() != null ? responseBody.getRec().size() : 0);

			return responseBody;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("수시입출금 상품 목록 조회 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * 계좌 거래내역 조회 (단건)
	 *
	 * @param accountNo            계좌번호 (16자리)
	 * @param transactionUniqueNo  거래고유번호
	 * @param userKey              사용자 KEY
	 * @return 거래 내역
	 */
	public InquireTransactionHistoryResponse.TransactionRec inquireTransactionHistory(
		String accountNo, String transactionUniqueNo, String userKey) {

		String apiName = "inquireTransactionHistory";

		// Header 생성
		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			userKey,
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		InquireTransactionHistoryRequest request = InquireTransactionHistoryRequest.builder()
			.header(header)
			.accountNo(accountNo)
			.transactionUniqueNo(transactionUniqueNo)
			.build();

		log.info("계좌 거래내역 조회(단건) 요청: accountNo={}, transactionUniqueNo={}", accountNo, transactionUniqueNo);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<InquireTransactionHistoryRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<InquireTransactionHistoryResponse> response = financeApiRestTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
				entity,
				InquireTransactionHistoryResponse.class
			);

			InquireTransactionHistoryResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getHeader() == null) {
				log.error("계좌 거래내역 조회 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("계좌 거래내역 조회 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			InquireTransactionHistoryResponse.TransactionRec rec = responseBody.getRec();

			log.info("계좌 거래내역 조회 성공: transactionSummary={}", rec.getTransactionSummary());

			return rec;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("계좌 거래내역 조회 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * 수시입출금 계좌 생성
	 *
	 * @param accountTypeUniqueNo 상품 고유번호
	 * @param userKey             사용자 KEY
	 * @return 생성된 계좌 정보
	 */
	public CreateDemandDepositAccountResponse.CreateDemandDepositAccountRec createDemandDepositAccount(
		String accountTypeUniqueNo, String userKey) {

		String apiName = "createDemandDepositAccount";

		// Header 생성
		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			userKey,
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		CreateDemandDepositAccountRequest request = CreateDemandDepositAccountRequest.builder()
			.header(header)
			.accountTypeUniqueNo(accountTypeUniqueNo)
			.build();

		log.info("수시입출금 계좌 생성 요청: accountTypeUniqueNo={}, userKey={}", accountTypeUniqueNo, userKey);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<CreateDemandDepositAccountRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<CreateDemandDepositAccountResponse> response = financeApiRestTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
				entity,
				CreateDemandDepositAccountResponse.class
			);

			CreateDemandDepositAccountResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getHeader() == null) {
				log.error("수시입출금 계좌 생성 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("수시입출금 계좌 생성 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			CreateDemandDepositAccountResponse.CreateDemandDepositAccountRec rec = responseBody.getRec();

			log.info("수시입출금 계좌 생성 성공: accountNo={}, bankCode={}",
				rec.getAccountNo(), rec.getBankCode());

			return rec;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("수시입출금 계좌 생성 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * 계좌 입금 (토스 결제 후 에스크로 입금용)
	 * 출금 없이 특정 계좌에 입금만 수행
	 *
	 * @param accountNo           입금할 계좌번호 (에스크로 계좌)
	 * @param transactionBalance  입금 금액
	 * @param transactionSummary  거래 요약 (예: "Toss 결제 에스크로 입금")
	 * @param userKey             계좌 사용자 KEY (에스크로 계좌 userKey)
	 * @return 거래 고유번호
	 */
	public TransferOutcome depositMoney(
			String accountNo,
			Long transactionBalance,
			String transactionSummary,
			String userKey
	) {
		String apiName = "updateDemandDepositAccountDeposit";

		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
				apiName,
				apiName,
				financeApiProperties.getApiKey(),
				userKey,
				financeApiProperties.getInstitutionCode(),
				financeApiProperties.getFintechAppNo()
		);

		Map<String, Object> request = new HashMap<>();
		request.put("Header", header);
		request.put("accountNo", accountNo);
		request.put("transactionBalance", transactionBalance);
		request.put("transactionSummary", transactionSummary);

		log.info("계좌 입금 요청: accountNo={}, 금액={}, 내역={}",
				accountNo, transactionBalance, transactionSummary);

		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

			Object responseObj = financeApiRestTemplate.postForObject(
					financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
					entity,
					Object.class
			);

			return classifyTransferResponse("계좌 입금", responseObj);

		} catch (HttpClientErrorException e) {
			// 4xx는 금융망이 요청을 받고 거절한 것이다. 돈은 옮겨지지 않았다.
			log.warn("계좌 입금 거절: accountNo={}, status={}, body={}",
					accountNo, e.getStatusCode(), e.getResponseBodyAsString());
			return new TransferOutcome.Rejected(
					e.getStatusCode().toString(), e.getResponseBodyAsString());

		} catch (Exception e) {
			// 타임아웃, 연결 실패, 5xx는 입금이 됐는지 알 수 없다.
			// 연결 타임아웃만 "보내지 않았다"로 가를 수도 있으나, 클라이언트 구현에 따라
			// 연결 타임아웃과 읽기 타임아웃이 같은 예외로 올라와 안전하게 가르기 어렵다.
			// 미확정으로 잘못 분류하면 재조회 한 번이 더 들고, 확정 실패로 잘못 분류하면
			// 이미 옮겨진 돈을 장부에서 지운다. 그래서 모르는 것은 전부 미확정으로 둔다.
			log.error("계좌 입금 결과 미확정: accountNo={}, 금액={}",
					accountNo, transactionBalance, e);
			return new TransferOutcome.Unconfirmed(
					e.getClass().getSimpleName() + ": " + e.getMessage());
		}
	}

	/**
	 * 금융망 입금·송금 응답을 확정 결과로 옮긴다.
	 *
	 * <p>헤더의 응답 코드가 H0000일 때만 성공으로 본다. 그 밖의 코드는 금융망이 요청을 받고
	 * 거절한 것이므로 확정 실패로 본다. 응답이 비었거나 모양이 예상과 다르면 무슨 일이
	 * 있었는지 알 수 없으므로 미확정으로 둔다.
	 *
	 * <p>H0000이 아닌 코드 안에도 성격이 다른 것이 섞여 있을 수 있다. 코드별 분류는 아직
	 * 하지 않았고, 그때까지는 전부 확정 실패로 둔다.
	 */
	private TransferOutcome classifyTransferResponse(String what, Object responseObj) {
		if (responseObj == null) {
			log.error("{} 응답이 null입니다", what);
			return new TransferOutcome.Unconfirmed("응답 없음");
		}

		if (!(responseObj instanceof Map<?, ?> responseBody)) {
			log.error("{} 응답 모양을 알 수 없습니다: {}", what, responseObj);
			return new TransferOutcome.Unconfirmed("응답 모양 불명");
		}

		if (!(responseBody.get("Header") instanceof Map<?, ?> headerMap)) {
			log.error("{} 응답에 Header가 없습니다: {}", what, responseBody);
			return new TransferOutcome.Unconfirmed("Header 없음");
		}

		String responseCode = String.valueOf(headerMap.get("responseCode"));
		if (!"H0000".equals(responseCode)) {
			log.warn("{} 거절: {}", what, headerMap);
			return new TransferOutcome.Rejected(
					responseCode, String.valueOf(headerMap.get("responseMessage")));
		}

		Object recObj = responseBody.get("REC");
		String transactionUniqueNo = extractTransactionUniqueNo(recObj);
		if (transactionUniqueNo == null) {
			// 성공 코드가 왔는데 거래고유번호가 없으면 나중에 이 건을 다시 물을 수 없다.
			// 확정할 근거가 모자라므로 미확정으로 둔다.
			log.error("{} 성공 응답에 거래고유번호가 없습니다: {}", what, recObj);
			return new TransferOutcome.Unconfirmed("거래고유번호 없음");
		}

		log.info("{} 성공: transactionUniqueNo={}", what, transactionUniqueNo);
		return new TransferOutcome.Succeeded(transactionUniqueNo);
	}

	/**
	 * REC는 단건이면 Map, 다건이면 List로 온다. 둘 다에서 거래고유번호를 꺼낸다.
	 */
	private String extractTransactionUniqueNo(Object recObj) {
		if (recObj instanceof Map<?, ?> recMap) {
			Object v = recMap.get("transactionUniqueNo");
			return v == null ? null : String.valueOf(v);
		}
		if (recObj instanceof List<?> list && !list.isEmpty()) {
			return extractTransactionUniqueNo(list.get(0));
		}
		return null;
	}


	/**
	 * 예금주 조회 (계좌번호로 예금주명 조회)
	 *
	 * @param accountNo 계좌번호
	 * @param userKey   사용자 KEY
	 * @return 예금주명
	 */
	public String inquireDemandDepositAccountHolderName(String accountNo, String userKey) {
		String apiName = "inquireDemandDepositAccountHolderName";

		// Header 생성
		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
			apiName,
			apiName,
			financeApiProperties.getApiKey(),
			userKey,
			financeApiProperties.getInstitutionCode(),
			financeApiProperties.getFintechAppNo()
		);

		// Request 생성
		InquireDemandDepositAccountHolderNameRequest request = InquireDemandDepositAccountHolderNameRequest.builder()
			.header(header)
			.accountNo(accountNo)
			.build();

		log.info("예금주 조회 요청: accountNo={}", accountNo);

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<InquireDemandDepositAccountHolderNameRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<InquireDemandDepositAccountHolderNameResponse> response = financeApiRestTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
				entity,
				InquireDemandDepositAccountHolderNameResponse.class
			);

			InquireDemandDepositAccountHolderNameResponse responseBody = response.getBody();

			if (responseBody == null || responseBody.getRec() == null) {
				log.error("예금주 조회 응답이 null입니다");
				throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
			}

			// 응답 코드 확인
			if (!"H0000".equals(responseBody.getHeader().getResponseCode())) {
				log.error("예금주 조회 실패: responseCode={}, responseMessage={}",
					responseBody.getHeader().getResponseCode(),
					responseBody.getHeader().getResponseMessage());
				throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
			}

			String userName = responseBody.getRec().getUserName();

			log.info("예금주 조회 성공: accountNo={}, userName={}", accountNo, userName);

			return userName;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("예금주 조회 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * 계좌 출금 (송금)
	 * Joying 중개계좌 → 사용자 계좌로 송금
	 *
	 * @param withdrawalAccountNo  출금 계좌번호 (Joying 중개계좌)
	 * @param depositAccountNo     입금 계좌번호 (사용자 계좌)
	 * @param transactionBalance   거래 금액
	 * @param transactionSummary   거래 요약 (예: "대여료 정산", "보증금 환불")
	 * @param withdrawalUserKey    출금 계좌 사용자 KEY (Joying 중개계좌 userKey)
	 * @return 거래 고유번호
	 */
	public TransferOutcome transferMoney(
			String withdrawalAccountNo,
			String depositAccountNo,
			Long transactionBalance,
			String transactionSummary,
			String withdrawalUserKey
	) {


		String apiName = "updateDemandDepositAccountTransfer";

		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
				apiName,
				apiName,
				financeApiProperties.getApiKey(),
				withdrawalUserKey,
				financeApiProperties.getInstitutionCode(),
				financeApiProperties.getFintechAppNo()
		);

		Map<String, Object> request = new HashMap<>();
		request.put("Header", header);
		request.put("withdrawalAccountNo", withdrawalAccountNo);
		request.put("transactionBalance", transactionBalance);
		request.put("depositAccountNo", depositAccountNo);
		request.put("withdrawalTransactionSummary", transactionSummary);
		request.put("depositTransactionSummary", transactionSummary);

		log.info("계좌 송금 요청: {} → {}, 금액={}, 내역={}",
				withdrawalAccountNo, depositAccountNo, transactionBalance, transactionSummary);

		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

			Object responseObj = financeApiRestTemplate.postForObject(
					financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
					entity,
					Object.class
			);

			return classifyTransferResponse("계좌 송금", responseObj);

		} catch (HttpClientErrorException e) {
			// 4xx는 금융망이 요청을 받고 거절한 것이다. 돈은 옮겨지지 않았다.
			log.warn("계좌 송금 거절: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
			return new TransferOutcome.Rejected(
					e.getStatusCode().toString(), e.getResponseBodyAsString());

		} catch (Exception e) {
			// 타임아웃, 연결 실패, 5xx는 송금이 나갔는지 알 수 없다.
			// 여기서 실패로 확정하고 되돌리면, 실제로 나간 돈을 장부에서 지운다.
			log.error("계좌 송금 결과 미확정", e);
			return new TransferOutcome.Unconfirmed(
					e.getClass().getSimpleName() + ": " + e.getMessage());
		}
	}

	/**
	 * 계좌거래내역조회(목록).
	 *
	 * <p>송금 결과가 미확정으로 남은 건은 거래고유번호를 받지 못해 단건 조회로는 확인할 수
	 * 없다. 이 조회로 계좌의 기간별 거래를 받아, 거래 요약에 심어 둔 주문번호로 찾는다.
	 *
	 * <p>조회 자체가 실패하면 빈 목록이 아니라 예외를 던진다. 빈 목록을 돌려주면
	 * 부르는 쪽이 "거래가 없었다"로 읽어 미확정 건을 실패로 확정해 버린다.
	 *
	 * @param accountNo 조회할 계좌번호
	 * @param startDate 조회 시작일 yyyyMMdd
	 * @param endDate   조회 종료일 yyyyMMdd
	 * @param userKey   계좌 사용자 KEY
	 * @return 기간 내 거래 목록. 거래가 없으면 빈 목록
	 */
	public List<InquireTransactionHistoryResponse.TransactionRec> inquireTransactionHistoryList(
			String accountNo,
			String startDate,
			String endDate,
			String userKey
	) {
		String apiName = "inquireTransactionHistoryList";

		SsafyApiHeader header = SsafyApiHeader.createRequestHeaderWithUserKey(
				apiName,
				apiName,
				financeApiProperties.getApiKey(),
				userKey,
				financeApiProperties.getInstitutionCode(),
				financeApiProperties.getFintechAppNo()
		);

		InquireTransactionHistoryListRequest request = InquireTransactionHistoryListRequest.builder()
				.header(header)
				.accountNo(accountNo)
				.startDate(startDate)
				.endDate(endDate)
				.transactionType("A")
				.orderByType("DESC")
				.build();

		log.info("계좌거래내역 목록 조회 요청: accountNo={}, {}~{}", accountNo, startDate, endDate);

		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<InquireTransactionHistoryListRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<InquireTransactionHistoryListResponse> response =
					financeApiRestTemplate.postForEntity(
							financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
							entity,
							InquireTransactionHistoryListResponse.class
					);

			InquireTransactionHistoryListResponse body = response.getBody();
			if (body == null || body.getHeader() == null
					|| !"H0000".equals(body.getHeader().getResponseCode())) {
				log.error("계좌거래내역 목록 조회 실패: accountNo={}, body={}", accountNo, body);
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			if (body.getRec() == null || body.getRec().getList() == null) {
				return List.of();
			}

			log.info("계좌거래내역 목록 조회 성공: accountNo={}, 건수={}",
					accountNo, body.getRec().getList().size());
			return body.getRec().getList();

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("계좌거래내역 목록 조회 중 오류 발생: accountNo={}", accountNo, e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

}