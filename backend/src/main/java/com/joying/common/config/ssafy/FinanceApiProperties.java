package com.joying.common.config.ssafy;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SSAFY 금융망 API 설정
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "ssafy.finance")
public class FinanceApiProperties {

	/**
	 * SSAFY 금융망 Base URL
	 */
	private String baseUrl;

	/**
	 * API KEY (앱 관리자 키)
	 */
	private String apiKey;

	/**
	 * 기관 코드 (고정값: 00100)
	 */
	private String institutionCode = "00100";

	/**
	 * 핀테크 앱 번호 (고정값: 001)
	 */
	private String fintechAppNo = "001";
}