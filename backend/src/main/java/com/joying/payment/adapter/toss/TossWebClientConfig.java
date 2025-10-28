package com.joying.payment.adapter.toss;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class TossWebClientConfig {
    @Bean
    public WebClient tossWebClient() {
        return WebClient.builder()
                .baseUrl("https://api.tosspayments.com") // 토스 기본 엔드포인트
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
