package com.joying.common.config.scheduling;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 스케줄링 설정
 * - local 프로파일에서는 비활성화 (개발 편의성)
 */
@Configuration
@EnableScheduling
@Profile("!local")  // local 프로파일이 아닐 때만 활성화
public class SchedulingConfig {
}