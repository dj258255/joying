package com.joying.account.service;

import com.joying.account.dto.ClientTokenResponse;
import com.joying.account.dto.OpenBankingRealNameRequest;
import com.joying.account.dto.OpenBankingRealNameResponse;
import com.joying.common.config.openbanking.OpenBankingProperties;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenBankingService {

	private final OpenBankingProperties openBankingProperties;
	private final RestTemplate restTemplate = new RestTemplate();

	/**
	 * 이용기관 인증 토큰 발급 (2-legged)
	 * Client ID/Secret만으로 토큰 발급
	 *
	 * @return Access Token
	 */
	public String getClientAccessToken() {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

		MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
		params.add("client_id", openBankingProperties.getClientId());
		params.add("client_secret", openBankingProperties.getClientSecret());
		params.add("scope", "oob");
		params.add("grant_type", "client_credentials");

		HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

		String url = openBankingProperties.getBaseUrl() + "/oauth/2.0/token";

		log.info("토큰 발급 요청 URL: {}", url);
		log.info("Client ID: {}", openBankingProperties.getClientId());

		try {
			ResponseEntity<ClientTokenResponse> response = restTemplate.postForEntity(
				url,
				request,
				ClientTokenResponse.class
			);

			log.info("토큰 발급 응답 상태: {}", response.getStatusCode());
			log.info("토큰 발급 응답 Body: {}", response.getBody());

			if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
				String accessToken = response.getBody().getAccessToken();
				if (accessToken != null) {
					log.info("이용기관 토큰 발급 성공: {}", accessToken.substring(0, Math.min(20, accessToken.length())) + "...");
					return accessToken;
				} else {
					log.error("응답은 성공했으나 accessToken이 null입니다. Body: {}", response.getBody());
				}
			}

			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "토큰 발급 실패");

		} catch (Exception e) {
			log.error("이용기관 토큰 발급 실패: {}", e.getMessage(), e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "오픈뱅킹 토큰 발급에 실패했습니다: " + e.getMessage());
		}
	}

	/**
	 * 계좌실명조회 (1원 인증)
	 *
	 * @param bankCode           은행 코드 (3자리)
	 * @param accountNum         계좌번호
	 * @param accountHolderInfo  예금주 생년월일 (YYYYMMDD)
	 * @return 계좌실명조회 결과
	 */
	public OpenBankingRealNameResponse verifyAccountRealName(
		String bankCode,
		String accountNum,
		String accountHolderInfo
	) {
		// 1. 이용기관 토큰 발급
		String accessToken = getClientAccessToken();

		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(accessToken);
		headers.setContentType(MediaType.APPLICATION_JSON);

		// 요청 DTO 생성
		OpenBankingRealNameRequest requestBody = OpenBankingRealNameRequest.builder()
			.bankTranId(generateBankTranId())
			.bankCodeStd(bankCode)
			.accountNum(accountNum)
			.accountHolderInfoType(" ")  // 공백 = 생년월일
			.accountHolderInfo(accountHolderInfo)
			.tranDtime(generateTranDtime())
			.build();

		HttpEntity<OpenBankingRealNameRequest> request = new HttpEntity<>(requestBody, headers);

		String url = openBankingProperties.getBaseUrl() + "/v2.0/inquiry/real_name";

		try {
			ResponseEntity<OpenBankingRealNameResponse> response = restTemplate.postForEntity(
				url,
				request,
				OpenBankingRealNameResponse.class
			);

			if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
				OpenBankingRealNameResponse body = response.getBody();

				if (body.isSuccess()) {
					log.info("계좌실명조회 성공: 은행={}, 계좌번호={}, 예금주={}",
						body.getBankName(), body.getAccountNumMasked(), body.getAccountHolderName());
					return body;
				}

				log.error("계좌실명조회 실패: {} - {}", body.getRspCode(), body.getRspMessage());
				throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED,
					"계좌 인증 실패: " + body.getRspMessage());
			}

			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "계좌실명조회 요청 실패");

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("계좌실명조회 API 호출 실패: {}", e.getMessage(), e);
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
				"계좌실명조회 중 오류가 발생했습니다: " + e.getMessage());
		}
	}

	/**
	 * 은행거래고유번호 생성
	 * 형식: 이용기관코드(10자리) + U + 난수(9자리 숫자)
	 */
	private String generateBankTranId() {
		String useCode = openBankingProperties.getUseCode();
		// 이용기관코드가 10자리 미만이면 오른쪽을 0으로 패딩
		if (useCode.length() < 10) {
			useCode = String.format("%-10s", useCode).replace(' ', '0');
		}
		// 9자리 숫자 난수 생성 (0 ~ 999999999)
		int randomNum = (int)(Math.random() * 1000000000);
		return useCode + "U" + randomNum;
	}

	/**
	 * 거래일시 생성 (YYYYMMDDHHmmss)
	 */
	private String generateTranDtime() {
		return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
	}
}
