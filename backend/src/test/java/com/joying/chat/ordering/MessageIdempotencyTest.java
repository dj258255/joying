package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.testcontainers.containers.MongoDBContainer;

import com.joying.chat.document.ChatMessage;

/**
 * 같은 전송이 두 건이 되지 않는지 잰다.
 *
 * <p>발행이 실패하면 저장은 됐는데 전달이 안 된 상태가 된다. 사용자가 다시 보내면
 * 예전에는 새 문서가 하나 더 생겼다.
 *
 * <p>판정을 애플리케이션 조회로 하면 동시에 들어온 두 요청이 둘 다 없다고 읽고 둘 다
 * 넣는다. 그래서 저장소의 유니크 제약에 맡긴다. 여기서 재는 것이 그 성질이다.
 */
class MessageIdempotencyTest {

	private static MongoDBContainer mongo;
	private static MongoTemplate mongoTemplate;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 100L;

	private final AtomicLong sequence = new AtomicLong();

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
		// 제약은 컬렉션을 새로 만들 때마다 다시 걸어야 한다
		mongoTemplate.indexOps(ChatMessage.class).ensureIndex(
			new org.springframework.data.mongodb.core.index.Index()
				.on("chatRoomId", org.springframework.data.domain.Sort.Direction.ASC)
				.on("clientMessageId", org.springframework.data.domain.Sort.Direction.ASC)
				.named("uk_chat_room_id_client_message_id")
				.unique()
				// 값이 문자열일 때만 제약을 건다. sparse 는 null 을 걸러 주지 않는다.
				.partial(org.springframework.data.mongodb.core.index.PartialIndexFilter.of(
					Criteria.where("clientMessageId").type(2))));
	}

	private ChatMessage save(String clientMessageId) {
		ChatMessage message = ChatMessage.createTextMessage(ROOM_ID, SENDER_ID, "안녕하세요", null);
		message.setCreatedAt(Instant.now());
		message.assign(sequence.incrementAndGet(), clientMessageId);
		return mongoTemplate.save(message);
	}

	private long countInRoom() {
		return mongoTemplate.count(Query.query(Criteria.where("chatRoomId").is(ROOM_ID)),
			ChatMessage.class);
	}

	@Test
	@DisplayName("같은 전송 식별자로 두 번 저장하면 두 번째가 막힌다")
	void sameClientMessageIdIsRejected() {
		save("send-1");

		assertThat(catchDuplicate(() -> save("send-1")))
			.as("막지 않으면 같은 말풍선이 두 번 뜬다")
			.isTrue();
		assertThat(countInRoom()).isEqualTo(1);
	}

	@Test
	@DisplayName("같은 식별자가 동시에 들어와도 한 건만 남는다")
	void concurrentSameIdKeepsOne() throws Exception {
		int attempts = 16;
		ExecutorService pool = Executors.newFixedThreadPool(attempts);

		List<Callable<Boolean>> tasks = IntStream.range(0, attempts)
			.<Callable<Boolean>>mapToObj(i -> () -> catchDuplicate(() -> save("send-same")))
			.toList();

		pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);

		System.out.println("[측정] 같은 식별자 " + attempts + "건 동시 저장 후 남은 문서 = "
			+ countInRoom());
		assertThat(countInRoom())
			.as("애플리케이션 조회로 막으면 둘 다 없다고 읽고 둘 다 넣는다")
			.isEqualTo(1);
	}

	@Test
	@DisplayName("식별자가 없으면 멱등을 걸지 않고 그대로 저장한다")
	void nullIdentifierIsNotDeduplicated() {
		// 예전 화면은 이 값을 보내지 않는다. 그때는 막지 않고 그대로 넣는다.
		save(null);
		save(null);

		assertThat(countInRoom()).isEqualTo(2);
	}

	private boolean catchDuplicate(Runnable task) {
		try {
			task.run();
			return false;
		} catch (DuplicateKeyException e) {
			return true;
		}
	}
}
