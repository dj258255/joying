package com.joying.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 개발 모드 설정
 * - 테스트 편의성을 위한 설정
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.dev-mode")
public class DevModeProperties {

    /**
     * 본인 상품 대여 허용 여부
     * - true: 본인 상품도 대여 가능 (개발/테스트) → Owner = Renter로 모든 권한 통과
     * - false: 본인 상품 대여 불가 (프로덕션)
     */
    private boolean allowSelfRental = false;
}
