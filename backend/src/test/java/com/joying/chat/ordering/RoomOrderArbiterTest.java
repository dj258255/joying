package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import com.joying.chat.metrics.ChatMetrics;
import com.joying.chat.service.RoomOrderArbiter;

/**
 * 방 순서 중재자가 발급 순서와 발행 순서를 같게 만드는지 검증한다.
 *
 * <p>두 노드를 중재자 인스턴스 두 개로 흉내 낸다. 잠금이 제대로 서면 임계 구역
 * 안의 [번호 발급 → 발행 기록]이 통째로 직렬화되므로, 발행 기록은 반드시
 * 오름차순이다. 잠금이 깨지면 발급과 기록 사이에 다른 쪽이 끼어들어 역전이
 * 생길 수 있다.
 *
 * <p>잠금이 없을 때 실제로 역전이 생긴다는 대조군은 여기서 단언하지 않는다.
 * 확률적이라 통과와 실패가 환경에 따라 갈린다. 그 수치는 부하 실험(#94)이 잰다.
 */
class RoomOrderArbiterTest {

	private static GenericContainer<?> redis;
	private static StringRedisTemplate template;

	private ChatMetrics metrics;

	@BeforeAll
	static void startRedis() {
		redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
			.withExposedPorts(6379);
		redis.start();
		LettuceConnectionFactory factory = new LettuceConnectionFactory(
			redis.getHost(), redis.getMappedPort(6379));
		factory.afterPropertiesSet();
		template = new StringRedisTemplate(factory);
		template.afterPropertiesSet();
	}

	@AfterAll
	static void stopRedis() {
		redis.stop();
	}

	@BeforeEach
	void setUp() {
		metrics = mock(ChatMetrics.class);
		template.delete(template.keys("chat:*"));
	}

	private RoomOrderArbiter arbiter(String mode) {
		return new RoomOrderArbiter(template, metrics, mode, 2000, 3000);
	}

	@Test
	@DisplayName("두 노드가 같은 방에 보내도 발급 순서대로 발행된다")
	void publishesInIssueOrderAcrossNodes() throws Exception {
		RoomOrderArbiter node1 = arbiter("arbiter");
		RoomOrderArbiter node2 = arbiter("arbiter");
		long roomId = 501L;
		int perNode = 200;

		// 발급은 실제 발급기와 같은 Redis 증가 연산, 발행은 큐에 넣는 것으로 삼는다
		ConcurrentLinkedQueue<Long> published = new ConcurrentLinkedQueue<>();
		Runnable sendOnce1 = () -> node1.inRoomOrder(roomId, () -> {
			Long seq = template.opsForValue().increment("chat:sequence:" + roomId);
			published.add(seq);
			return null;
		});
		Runnable sendOnce2 = () -> node2.inRoomOrder(roomId, () -> {
			Long seq = template.opsForValue().increment("chat:sequence:" + roomId);
			published.add(seq);
			return null;
		});

		ExecutorService pool = Executors.newFixedThreadPool(2);
		CountDownLatch start = new CountDownLatch(1);
		CountDownLatch done = new CountDownLatch(2);
		pool.submit(() -> {
			await(start);
			for (int i = 0; i < perNode; i++) {
				sendOnce1.run();
			}
			done.countDown();
		});
		pool.submit(() -> {
			await(start);
			for (int i = 0; i < perNode; i++) {
				sendOnce2.run();
			}
			done.countDown();
		});
		start.countDown();
		assertThat(done.await(60, TimeUnit.SECONDS)).isTrue();
		pool.shutdownNow();

		List<Long> order = new ArrayList<>(published);
		assertThat(order).hasSize(perNode * 2);
		for (int i = 1; i < order.size(); i++) {
			assertThat(order.get(i))
				.as("발행 %d번째에서 역전: %d 뒤에 %d", i, order.get(i - 1), order.get(i))
				.isGreaterThan(order.get(i - 1));
		}
		verify(metrics, atLeastOnce()).recordOrderLockWait(anyLong());
	}

	@Test
	@DisplayName("다른 방은 서로 기다리지 않는다")
	void differentRoomsDoNotWait() throws Exception {
		RoomOrderArbiter holder = arbiter("arbiter");
		RoomOrderArbiter other = arbiter("arbiter");

		CountDownLatch holding = new CountDownLatch(1);
		CountDownLatch release = new CountDownLatch(1);
		ExecutorService pool = Executors.newSingleThreadExecutor();
		pool.submit(() -> holder.inRoomOrder(601L, () -> {
			holding.countDown();
			await(release);
			return null;
		}));
		assertThat(holding.await(5, TimeUnit.SECONDS)).isTrue();

		// 601 잠금이 잡혀 있는 동안 602 는 바로 지나가야 한다
		long started = System.nanoTime();
		other.inRoomOrder(602L, () -> null);
		long elapsedMillis = Duration.ofNanos(System.nanoTime() - started).toMillis();
		assertThat(elapsedMillis).isLessThan(1000);

		release.countDown();
		pool.shutdownNow();
	}

	@Test
	@DisplayName("기본 모드(node)에서는 잠금 키를 만들지 않고 그대로 실행한다")
	void nodeModeRunsWithoutLock() {
		RoomOrderArbiter arbiter = arbiter("node");
		String result = arbiter.inRoomOrder(701L, () -> "ran");
		assertThat(result).isEqualTo("ran");
		assertThat(template.hasKey("chat:order-lock:701")).isFalse();
	}

	@Test
	@DisplayName("잠금을 상한 안에 못 잡으면 버리지 않고 잠금 없이 실행하며 건수를 센다")
	void timeoutRunsUnlockedAndCounts() {
		// 다른 노드가 잡은 잠금이 풀리지 않는 상황을 만든다
		template.opsForValue().set("chat:order-lock:801", "someone-else",
			Duration.ofSeconds(30));
		RoomOrderArbiter impatient = new RoomOrderArbiter(template, metrics, "arbiter", 2000, 150);

		String result = impatient.inRoomOrder(801L, () -> "ran-anyway");

		assertThat(result).isEqualTo("ran-anyway");
		verify(metrics).orderLockTimeout();
		// 남의 잠금을 지우지 않았다
		assertThat(template.opsForValue().get("chat:order-lock:801")).isEqualTo("someone-else");
	}

	private static void await(CountDownLatch latch) {
		try {
			latch.await();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(e);
		}
	}
}
