package com.joying.chat.reconnect;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.testcontainers.containers.MongoDBContainer;

import com.joying.chat.document.ChatMessage;

/**
 * 끊긴 동안 온 메시지를 다시 받을 수 있는지 잰다.
 *
 * <p>웹소켓이 끊기면 그 사이에 온 것은 오지 않는다. 다시 붙었을 때 무엇까지 받았는지를
 * 알고 그 뒤를 달라고 해야 메울 수 있다.
 *
 * <p>여기서 재는 것은 저장소가 그 뒤를 정확히 돌려주는가다. 실제 화면이 그것을 부르는지는
 * 별개이고, 부르지 않으면 유실은 그대로 남는다.
 */
class ReconnectGapTest {

	private static MongoDBContainer mongo;
	private static MongoTemplate mongoTemplate;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 200L;

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
	 * 1초 간격으로 메시지를 쌓는다. 시각이 겹치면 어디까지 받았는지를 가릴 수 없다.
	 */
	private List<ChatMessage> given(int count, Instant start) {
		List<ChatMessage> saved = new ArrayList<>();
		for (int i = 0; i < count; i++) {
			ChatMessage message = ChatMessage.createTextMessage(
				ROOM_ID, SENDER_ID, "메시지 " + i, null);
			message.setCreatedAt(start.plus(i, ChronoUnit.SECONDS));
			saved.add(mongoTemplate.save(message));
		}
		return saved;
	}

	private List<ChatMessage> messagesAfter(Instant after, int limit) {
		return mongoTemplate.find(
			org.springframework.data.mongodb.core.query.Query.query(
					org.springframework.data.mongodb.core.query.Criteria
						.where("chatRoomId").is(ROOM_ID)
						.and("isDeleted").is(false)
						.and("createdAt").gt(after))
				.with(PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "createdAt"))),
			ChatMessage.class);
	}

	@Test
	@DisplayName("끊긴 사이에 온 것을 마지막으로 받은 시각 뒤로 전부 받는다")
	void receivesEverythingAfterTheLastSeen() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		List<ChatMessage> all = given(30, start);

		// 열 번째까지 받고 끊겼다고 본다
		Instant lastSeen = all.get(9).getCreatedAt();

		List<ChatMessage> gap = messagesAfter(lastSeen, 100);

		assertThat(gap)
			.as("끊긴 사이에 온 20건을 전부 받아야 한다")
			.hasSize(20);
		assertThat(gap.get(0).getContent()).isEqualTo("메시지 10");
	}

	@Test
	@DisplayName("마지막으로 받은 것 자체는 다시 오지 않는다")
	void doesNotResendTheLastSeenMessage() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		List<ChatMessage> all = given(5, start);

		List<ChatMessage> gap = messagesAfter(all.get(4).getCreatedAt(), 100);

		assertThat(gap)
			.as("이미 화면에 있는 것을 또 주면 같은 말풍선이 두 번 뜬다")
			.isEmpty();
	}

	@Test
	@DisplayName("오래된 순으로 준다. 받는 쪽이 순서대로 이어붙일 수 있어야 한다")
	void returnsOldestFirst() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(10, start);

		List<ChatMessage> gap = messagesAfter(start, 100);

		assertThat(gap).extracting(ChatMessage::getContent)
			.startsWith("메시지 1", "메시지 2", "메시지 3");
	}

	@Test
	@DisplayName("한 번에 받는 양에 상한이 있다. 오래 꺼져 있었으면 나눠 받는다")
	void limitsHowMuchComesAtOnce() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(500, start);

		List<ChatMessage> firstBatch = messagesAfter(start.minusSeconds(1), 100);

		assertThat(firstBatch)
			.as("상한이 없으면 며칠 꺼 뒀던 사람이 한 번에 수천 건을 받는다")
			.hasSize(100);

		Instant nextCursor = firstBatch.get(firstBatch.size() - 1).getCreatedAt();
		assertThat(messagesAfter(nextCursor, 100)).hasSize(100);
	}

	@Test
	@DisplayName("받은 지점을 모르면 어디서부터 달라고 할지 정할 수 없다")
	void withoutACursorTheGapCannotBeFilled() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(30, start);

		// 읽음 표시는 전달 표시가 아니다. 읽지 않았어도 받은 것은 받은 것이다.
		// 그래서 lastReadAt 을 커서로 쓰면 이미 화면에 있는 것까지 다시 온다.
		Instant lastReadAt = start;

		assertThat(messagesAfter(lastReadAt, 100))
			.as("읽음 표시를 커서로 쓰면 이미 받은 것까지 다시 온다")
			.hasSize(29);
	}
}
