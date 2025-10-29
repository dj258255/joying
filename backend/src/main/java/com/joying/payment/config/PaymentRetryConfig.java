package com.joying.payment.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

/**
 * 결제 재시도 설정
 *
 * 필요 의존성:
 * implementation 'org.springframework.retry:spring-retry'
 * implementation 'org.springframework.boot:spring-boot-starter-aop'
 */
@Configuration
@EnableRetry
public class PaymentRetryConfig {
    // @Retryable 어노테이션 활성화
}
