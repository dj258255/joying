package com.joying.account.service;

import com.joying.account.dto.OpenBankingAccountListResponse;
import com.joying.account.dto.OpenBankingTokenResponse;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenBankingService {

	private final OpenBankingProperties openBankingProperties;
	private final RestTemplate restTemplate = new RestTemplate();

	public String getAuthorizationUrl(String state) {
		return UriComponentsBuilder.fromHttpUrl(openBankingProperties.getAuthUri())
			.queryParam("response_type", "code")
			.queryParam("client_id", openBankingProperties.getClientId())
			.queryParam("redirect_uri", openBankingProperties.getRedirectUri())
			.queryParam("scope", "login inquiry transfer")
			.queryParam("state", state)
			.queryParam("auth_type", "0")
			.build()
			.toUriString();
	}

	public OpenBankingTokenResponse getAccessToken(String code) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

		MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
		params.add("code", code);
		params.add("client_id", openBankingProperties.getClientId());
		params.add("client_secret", openBankingProperties.getClientSecret());
		params.add("redirect_uri", openBankingProperties.getRedirectUri());
		params.add("grant_type", "authorization_code");

		HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

		try {
			ResponseEntity<OpenBankingTokenResponse> response = restTemplate.postForEntity(
				openBankingProperties.getTokenUri(),
				request,
				OpenBankingTokenResponse.class
			);

			if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
				log.info("오픈뱅킹 Access Token 발급 성공");
				return response.getBody();
			}

			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "토큰 발급 실패");

		} catch (Exception e) {
			log.error("오픈뱅킹 Access Token 발급 실패: {}", e.getMessage());
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "오픈뱅킹 인증에 실패했습니다.");
		}
	}

	public OpenBankingAccountListResponse getAccountList(String accessToken, String userSeqNo) {
		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(accessToken);
		headers.setContentType(MediaType.APPLICATION_JSON);

		String url = UriComponentsBuilder.fromHttpUrl(openBankingProperties.getBaseUrl() + "/v2.0/account/list")
			.queryParam("user_seq_no", userSeqNo)
			.queryParam("include_cancel_yn", "N")
			.queryParam("sort_order", "D")
			.build()
			.toUriString();

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {
			ResponseEntity<OpenBankingAccountListResponse> response = restTemplate.exchange(
				url,
				HttpMethod.GET,
				request,
				OpenBankingAccountListResponse.class
			);

			if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
				OpenBankingAccountListResponse body = response.getBody();

				if ("A0000".equals(body.getRspCode())) {
					log.info("오픈뱅킹 계좌 목록 조회 성공: {} 건", body.getResCnt());
					return body;
				}

				log.error("오픈뱅킹 계좌 목록 조회 실패: {} - {}", body.getRspCode(), body.getRspMessage());
				throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "계좌 조회 실패: " + body.getRspMessage());
			}

			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "계좌 조회 실패");

		} catch (Exception e) {
			log.error("오픈뱅킹 계좌 목록 조회 실패: {}", e.getMessage());
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "오픈뱅킹 계좌 조회에 실패했습니다.");
		}
	}

	private String generateApiTranId() {
		String useCode = String.format("%-10s", openBankingProperties.getUseCode()).replace(' ', '0');
		String uniqueId = UUID.randomUUID().toString().replace("-", "").substring(0, 9);
		return useCode + "U" + uniqueId;
	}
}
