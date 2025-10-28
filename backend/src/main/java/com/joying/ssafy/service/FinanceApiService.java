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
import org.springframework.web.client.RestTemplate;

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
		String url = financeApiProperties.getBaseUrl() + "/member/search";

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
	 * @return USER KEY
	 */
	public String registerMember(String userId) {
		String url = financeApiProperties.getBaseUrl() + "/member";

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

			// userKey 반환 (응답에 이미 포함되어 있음)
			return userKey;

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
				financeApiProperties.getBaseUrl() + "/" + apiName,
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
	 * @param authCode  인증 코드 (6자리)
	 * @param userKey   사용자 KEY
	 * @return 인증 결과 (실명, 은행 정보 포함)
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
				financeApiProperties.getBaseUrl() + "/" + apiName,
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

			log.info("1원 인증 성공: accountNo={}, userName={}, bankName={}",
				accountNo, rec.getUserName(), rec.getBankName());

			return rec; // 전체 결과 반환 (실명, 은행코드, 은행명 포함)

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

		log.info("수시입출금 상품 목록 조회 요청");

		try {
			// API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<InquireDemandDepositListRequest> entity = new HttpEntity<>(request, headers);

			ResponseEntity<InquireDemandDepositListResponse> response = restTemplate.postForEntity(
				financeApiProperties.getBaseUrl() + "/" + apiName,
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
				financeApiProperties.getBaseUrl() + "/" + apiName,
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
}