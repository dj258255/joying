package com.joying.common.config.openbanking;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 금융결제원 오픈뱅킹 API 설정 (1원 인증 방식)
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "openbanking")
public class OpenBankingProperties {

	/**
	 * 오픈뱅킹 API Base URL
	 * 테스트: https://testapi.openbanking.or.kr
	 * 실서비스: https://openapi.openbanking.or.kr
	 */
	private String baseUrl;

	/**
	 * Client ID (오픈뱅킹에서 발급)
	 */
	private String clientId;

	/**
	 * Client Secret (오픈뱅킹에서 발급)
	 */
	private String clientSecret;

	/**
	 * 이용기관코드 (오픈뱅킹에서 발급)
	 */
	private String useCode;
}
