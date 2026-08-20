package com.joying;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Spring Boot 애플리케이션 컨텍스트 로딩 테스트
 *
 * TestcontainersConfiguration이 MySQL, MongoDB, Redis 컨테이너를 띄우고
 * 접속 정보를 설정으로 넣어 준다. 컨텍스트가 실제로 뜨는지만 확인한다.
 */
@SpringBootTest
// local을 같이 켜는 이유는 TossPaymentsClientImpl이 @Profile({"prod","local"})이라
// test만으로는 그 빈이 없어 결제 쪽 배선이 통째로 빠지기 때문이다. 붙는 주소는
// 컨테이너가 덮어쓴다.
@ActiveProfiles({"local", "test"})
@Import(TestcontainersConfiguration.class)
class JoyingApplicationTests {

	/**
	 * RedisConfig가 연결 팩토리를 설정값으로 직접 만들어 컨테이너 접속 정보를 보지 않는다.
	 * 그래서 이 자리만 손으로 넣어 준다.
	 */
	@DynamicPropertySource
	static void redisProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.data.redis.host",
			() -> TestcontainersConfiguration.getRedisContainer().getHost());
		registry.add("spring.data.redis.port",
			() -> TestcontainersConfiguration.getRedisContainer().getMappedPort(6379));
	}

	@Test
	void contextLoads() {
		// 컨텍스트가 뜨면 통과다. 빈 하나가 잘못 묶여 있어도 여기서 걸린다.
	}

}
