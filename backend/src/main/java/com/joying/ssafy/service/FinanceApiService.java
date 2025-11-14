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
	private final RestTemplate restTemplate = new RestTemplate();

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

			ResponseEntity<MemberRegisterResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<MemberRegisterResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<OpenAccountAuthResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<CheckAuthCodeResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<InquireDemandDepositListResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<InquireTransactionHistoryResponse> response = restTemplate.postForEntity(
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

			ResponseEntity<CreateDemandDepositAccountResponse> response = restTemplate.postForEntity(
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
	public String depositMoney(
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

			// Object로 받기
			Object responseObj = restTemplate.postForObject(
					financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
					entity,
					Object.class
			);

			if (responseObj == null) {
				log.error("계좌 입금 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			if (responseObj instanceof Map) {
				Map responseBody = (Map) responseObj;

				Map headerMap = (Map) responseBody.get("Header");
				if (headerMap == null || !"H0000".equals(headerMap.get("responseCode"))) {
					log.error("계좌 입금 실패: {}", headerMap);
					throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
				}

				Map recMap = (Map) responseBody.get("REC");
				String transactionUniqueNo = (String) recMap.get("transactionUniqueNo");

				log.info("계좌 입금 성공: transactionUniqueNo={}", transactionUniqueNo);
				return transactionUniqueNo;
			}

			// 리스트 응답 또는 기타 처리
			log.error("계좌 입금 실패(알 수 없는 응답): {}", responseObj);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("계좌 입금 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
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

			ResponseEntity<InquireDemandDepositAccountHolderNameResponse> response = restTemplate.postForEntity(
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
	public String transferMoney(
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

			Object responseObj = restTemplate.postForObject(
					financeApiProperties.getBaseUrl() + "/ssafy/api/v1/edu/demandDeposit/" + apiName,
					entity,
					Object.class
			);

			if (responseObj == null) {
				log.error("계좌 송금 응답이 null입니다");
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			// 성공/실패 공통: Response는 Map으로 온다
			if (!(responseObj instanceof Map)) {
				log.error("계좌 송금 실패(전체 응답 타입이 Map이 아님): {}", responseObj);
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			Map responseBody = (Map) responseObj;

			Map headerMap = (Map) responseBody.get("Header");
			if (headerMap == null || !"H0000".equals(headerMap.get("responseCode"))) {
				log.error("계좌 송금 실패(Header 오류): {}", headerMap);
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			Object recObj = responseBody.get("REC");

			/**
			 * 실패: REC = Map (errorCode, errorMessage)
			 */
			if (recObj instanceof Map) {
				log.error("계좌 송금 실패(REC=Map 오류): {}", recObj);
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
			}

			/**
			 * 성공: REC = List (출금/입금 2건)
			 */
			if (recObj instanceof List<?> list) {
				if (list.isEmpty()) {
					log.error("REC 리스트가 비어 있습니다: {}", list);
					throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
				}

				Map firstRecord = (Map) list.get(0);
				String transactionUniqueNo = (String) firstRecord.get("transactionUniqueNo");

				log.info("계좌 송금 성공: transactionUniqueNo={}", transactionUniqueNo);
				return transactionUniqueNo;
			}

			// 알 수 없는 구조
			log.error("계좌 송금 실패(REC 타입 알 수 없음): {}", recObj);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("계좌 송금 API 호출 중 오류 발생", e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}
}