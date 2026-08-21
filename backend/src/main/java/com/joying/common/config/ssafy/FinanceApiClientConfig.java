package com.joying.common.config.ssafy;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

/**
 * SSAFY 금융망 API 호출용 RestTemplate 설정.
 *
 * <p>금융망 호출은 실제로 계좌 사이에 돈을 옮긴다. 응답을 기다리는 시간에 제한이 없으면
 * 상대가 멈췄을 때 우리 스레드가 같이 멈추고, 그 사이 들어온 요청까지 밀린다.
 *
 * <p>값은 {@code ssafy.finance.connect-timeout}, {@code ssafy.finance.read-timeout}으로
 * 바꿀 수 있다. 상대 서버의 응답 분포는 환경마다 다르고, 값을 조정하려고 배포를 다시 하지
 * 않기 위해 상수로 박지 않았다.
 */
@Configuration
@RequiredArgsConstructor
public class FinanceApiClientConfig {

	private final FinanceApiProperties financeApiProperties;

	@Bean
	public RestTemplate financeApiRestTemplate(RestTemplateBuilder builder) {
		return builder
			.connectTimeout(financeApiProperties.getConnectTimeout())
			.readTimeout(financeApiProperties.getReadTimeout())
			.build();
	}
}
