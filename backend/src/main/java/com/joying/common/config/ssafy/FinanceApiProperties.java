package com.joying.common.config.ssafy;

import lombok.Getter;
import lombok.Setter;
import java.time.Duration;

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

	/**
	 * 연결을 맺는 데까지 기다리는 시간.
	 * 상대 서버가 살아 있는지를 가리는 값이라 짧게 잡아도 오탐이 적다.
	 */
	private Duration connectTimeout = Duration.ofSeconds(2);

	/**
	 * 연결된 뒤 응답 본문을 기다리는 시간.
	 * 이 시간이 지나면 송금이 성공했는지 알 수 없는 상태로 남으므로,
	 * 이 값을 줄이려면 미확정을 확정해 주는 복구 경로가 먼저 있어야 한다.
	 */
	private Duration readTimeout = Duration.ofSeconds(5);

	/**
	 * Joying 중개 계좌 정보 (에스크로)
	 */
	private Escrow escrow = new Escrow();

	@Getter
	@Setter
	public static class Escrow {
		/**
		 * 중개 계좌번호
		 */
		private String accountNo;

		/**
		 * 중개 계좌 사용자 KEY
		 */
		private String userKey;
	}
}