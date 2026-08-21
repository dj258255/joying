package com.joying;

import org.springframework.boot.test.context.TestConfiguration;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 테스트용 Redis 컨테이너.
 *
 * <p>{@link JoyingApplicationTests}가 참조하지만 저장소에 없어 테스트 소스가 컴파일되지
 * 않던 클래스다. 컨테이너는 JVM당 한 번만 띄우고 테스트가 끝나면 Ryuk이 정리한다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	private static final GenericContainer<?> REDIS_CONTAINER =
		new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
			.withExposedPorts(6379);

	static {
		REDIS_CONTAINER.start();
	}

	public static GenericContainer<?> getRedisContainer() {
		return REDIS_CONTAINER;
	}
}
