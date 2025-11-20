package com.joying.common.config.jpa;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 설정
 *
 * BaseEntity의 createdAt, updatedAt 자동 설정
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}