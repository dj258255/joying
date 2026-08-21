package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.testcontainers.containers.MongoDBContainer;

import com.joying.chat.document.ChatMessage;

/**
 * 보낸 순서와 보이는 순서가 같은지 잰다.
 *
 * <p>지금 순서를 정하는 값은 앱 서버가 저장 직전에 찍는 시각 하나뿐이다. 인바운드마다
 * 새 작업을 띄우므로, 같은 사람이 연속으로 보낸 두 건이 풀에서 경합한다. 먼저 도착한
 * 쪽이 아니라 먼저 실행된 쪽이 이른 시각을 가져간다.
 *
 * <p>여기서는 그 경합을 그대로 재현한다. 웹소켓을 띄우지 않고, 시각을 찍고 저장하는
 * 부분만 같은 모양으로 만들어 여러 스레드에서 돌린다.
 */
class MessageOrderTest {

	private static MongoDBContainer mongo;
	private static MongoTemplate mongoTemplate;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 100L;

	@BeforeAll
	static void startMongo() {
		mongo = new MongoDBContainer("mongo:7.0");
		mongo.start();
		mongoTemplate = new MongoTemplate(
			new SimpleMongoClientDatabaseFactory(mongo.getConnectionString() + "/joying_test"));
	}

	@AfterAll
	static void stopMongo() {
		if (mongo != null) {
			mongo.stop();
		}
	}

	@BeforeEach
	void clean() {
		mongoTemplate.dropCollection(ChatMessage.class);
	}

	/**
	 * 보낸 순서대로 번호를 매겨 저장한다. 시각은 저장 직전에 찍는다. 지금 코드와 같다.
	 */
	private void sendConcurrently(int count, int threads) throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(threads);
		List<Callable<Void>> tasks = IntStream.range(0, count)
			.<Callable<Void>>mapToObj(i -> () -> {
				ChatMessage message = ChatMessage.createTextMessage(
					ROOM_ID, SENDER_ID, String.valueOf(i), null);
				message.setCreatedAt(Instant.now());
				mongoTemplate.save(message);
				return null;
			}).toList();

		pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);
	}

	/**
	 * 브라우저가 하는 것과 같이 시각으로 정렬한 뒤, 보낸 번호가 오름차순인지 센다.
	 *
	 * @return 앞엣것보다 작은 번호가 나온 횟수
	 */
	private long inversionsWhenSortedByTime() {
		List<ChatMessage> messages = new ArrayList<>(
			mongoTemplate.find(Query.query(Criteria.where("chatRoomId").is(ROOM_ID)),
				ChatMessage.class));
		messages.sort(Comparator.comparing(ChatMessage::getCreatedAt));

		long inversions = 0;
		int previous = -1;
		for (ChatMessage message : messages) {
			int current = Integer.parseInt(message.getContent());
			if (current < previous) {
				inversions++;
			}
			previous = current;
		}
		return inversions;
	}

	@Test
	@DisplayName("한 사람이 연속으로 보내면 시각만으로는 순서가 뒤집힌다")
	void timestampAloneDoesNotPreserveOrder() throws Exception {
		sendConcurrently(200, 8);

		long inversions = inversionsWhenSortedByTime();

		// 이 테스트는 결함을 드러내는 것이 목적이라 뒤집힘이 나와야 통과한다.
		// 고친 뒤에는 번호로 정렬하므로 이 값이 무엇이든 순서가 맞는다.
		System.out.println("[측정] 200건 중 뒤집힌 횟수 = " + inversions);
		assertThat(inversions)
			.as("보낸 순서 200건을 시각으로 정렬했을 때 뒤집힌 횟수")
			.isPositive();
	}

	@Test
	@DisplayName("방마다 늘어나는 번호를 붙이면 뒤집히지 않는다")
	void sequencePreservesOrder() throws Exception {
		// 번호는 Redis 증가 연산으로 받는다. 여기서는 그 성질만 흉내 낸다.
		// 하나씩 늘어나고 같은 값이 두 번 나가지 않는다.
		java.util.concurrent.atomic.AtomicLong sequence = new java.util.concurrent.atomic.AtomicLong();

		ExecutorService pool = Executors.newFixedThreadPool(8);
		List<Callable<Void>> tasks = IntStream.range(0, 200)
			.<Callable<Void>>mapToObj(i -> () -> {
				ChatMessage message = ChatMessage.createTextMessage(
					ROOM_ID, SENDER_ID, "m", null);
				message.setCreatedAt(Instant.now());
				message.assign(sequence.incrementAndGet(), null);
				mongoTemplate.save(message);
				return null;
			}).toList();
		pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);

		List<ChatMessage> messages = new ArrayList<>(
			mongoTemplate.find(Query.query(Criteria.where("chatRoomId").is(ROOM_ID)),
				ChatMessage.class));
		messages.sort(Comparator.comparing(ChatMessage::getSequence));

		long inversions = 0;
		long previous = 0;
		java.util.Set<Long> seen = new java.util.HashSet<>();
		for (ChatMessage message : messages) {
			long current = message.getSequence();
			if (current < previous) {
				inversions++;
			}
			assertThat(seen.add(current)).as("같은 번호가 두 번 나가면 안 된다").isTrue();
			previous = current;
		}

		System.out.println("[측정] 번호로 정렬했을 때 뒤집힌 횟수 = " + inversions);
		assertThat(inversions).isZero();
		assertThat(messages).hasSize(200);
	}

	@Test
	@DisplayName("같은 밀리초에 저장된 것이 있으면 시각으로는 순서를 가릴 수 없다")
	void sameInstantCannotBeOrdered() throws Exception {
		Instant same = Instant.parse("2026-01-01T00:00:00Z");
		for (int i = 0; i < 10; i++) {
			ChatMessage message = ChatMessage.createTextMessage(
				ROOM_ID, SENDER_ID, String.valueOf(i), null);
			message.setCreatedAt(same);
			mongoTemplate.save(message);
		}

		List<ChatMessage> messages = mongoTemplate.find(
			Query.query(Criteria.where("chatRoomId").is(ROOM_ID)), ChatMessage.class);

		assertThat(messages).extracting(ChatMessage::getCreatedAt)
			.as("전부 같은 시각이라 무엇이 먼저인지 정할 근거가 없다")
			.containsOnly(same);
	}
}
