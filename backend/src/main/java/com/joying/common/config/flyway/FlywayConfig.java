package com.joying.common.config.flyway;

import org.flywaydb.core.Flyway;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/**
 * Flyway 설정
 * JPA가 테이블을 생성한 후 Flyway가 데이터를 INSERT하도록 순서 보장
 */
@Configuration
public class FlywayConfig {

    private final Flyway flyway;

    public FlywayConfig(Flyway flyway) {
        this.flyway = flyway;
    }

    /**
     * 애플리케이션이 완전히 준비된 후 Flyway 마이그레이션 실행
     * EntityManagerFactory가 이미 초기화되어 테이블이 생성된 상태
     */
    @EventListener(ApplicationReadyEvent.class)
    public void migrate() {
        // 이전 실패한 마이그레이션 정리
        flyway.repair();

        // 마이그레이션 실행
        flyway.migrate();
    }
}