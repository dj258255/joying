package com.joying;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Spring Boot 애플리케이션 컨텍스트 로딩 테스트
 *
 * Testcontainers를 사용하여 실제 Redis 컨테이너와 함께 테스트합니다.
 * TestcontainersConfiguration이 Redis 컨테이너를 자동으로 시작하고
 * @DynamicPropertySource가 컨테이너의 연결 정보를 Spring 환경에 주입합니다.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class JoyingApplicationTests {

	/**
	 * Redis 컨테이너의 연결 정보를 Spring 환경에 동적으로 주입
	 *
	 * TestcontainersConfiguration에서 시작된 Redis 컨테이너의
	 * 호스트와 포트 정보를 가져와서 spring.data.redis 설정을 오버라이드합니다.
	 */
	@DynamicPropertySource
	static void redisProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.data.redis.host",
			() -> TestcontainersConfiguration.getRedisContainer().getHost());
		registry.add("spring.data.redis.port",
			() -> TestcontainersConfiguration.getRedisContainer().getMappedPort(6379).toString());
	}

	@Test
	void contextLoads() {
		// Spring Boot 컨텍스트가 정상적으로 로딩되는지 확인
		// Redis 컨테이너가 자동으로 시작되어 연결됨
	}

}
