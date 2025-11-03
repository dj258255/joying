package com.joying.outbox.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Outbox 스케줄링 설정
 * - @EnableScheduling: @Scheduled 애노테이션 활성화
 * - OutboxEventProcessor의 폴링 스케줄러 동작
 */
@Configuration
@EnableScheduling
public class OutboxSchedulingConfig {
    // Spring Boot의 @Scheduled 기능 활성화
    // OutboxEventProcessor.pollAndProcess()가 1초마다 실행됨
}
