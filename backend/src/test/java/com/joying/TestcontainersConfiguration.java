package com.joying;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 컨텍스트를 띄우는 데 필요한 것들을 컨테이너로 준다.
 *
 * <p>{@link JoyingApplicationTests}가 참조하지만 저장소에 없어 테스트 소스가 컴파일되지
 * 않던 클래스다. 처음에는 주석이 설명하는 대로 Redis만 넣었는데, 그것만으로는 컨텍스트가
 * 뜨지 않았다. JPA가 붙을 데이터베이스를 찾지 못해 방언을 정하지 못한다.
 *
 * <p>MySQL과 MongoDB는 {@code @ServiceConnection}으로 접속 정보가 자동으로 들어간다.
 * Redis만 다르다. 이 프로젝트의 {@code RedisConfig}가 연결 팩토리를 설정값으로 직접
 * 만들기 때문에, 스프링이 컨테이너에서 뽑아 주는 접속 정보를 보지 않는다. 그래서
 * Redis 주소는 테스트에서 설정값으로 직접 넣어 준다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	private static final GenericContainer<?> REDIS =
		new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

	static {
		REDIS.start();
	}

	public static GenericContainer<?> getRedisContainer() {
		return REDIS;
	}

	@Bean
	@ServiceConnection
	MySQLContainer<?> mysqlContainer() {
		return new MySQLContainer<>(DockerImageName.parse("mysql:8.0"))
			.withDatabaseName("joying_test");
	}

	@Bean
	@ServiceConnection
	MongoDBContainer mongoContainer() {
		return new MongoDBContainer(DockerImageName.parse("mongo:7.0"));
	}
}
