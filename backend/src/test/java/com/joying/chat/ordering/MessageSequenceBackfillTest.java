package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.testcontainers.containers.MongoDBContainer;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.service.MessageSequenceBackfill;
import com.joying.chat.service.MessageSequenceGenerator;

/**
 * 번호를 도입하기 전에 저장된 메시지를 채우는 일을 잰다.
 *
 * <p>이 코드는 서버가 뜰 때 한 번 돌고 끝난다. 틀려도 바로 보이지 않고, 한참 뒤에
 * 순서가 이상하다는 신고로 돌아온다. 그래서 실제 MongoDB에 넣고 확인한다.
 *
 * <p>재는 것은 셋이다. 하나도 빠뜨리지 않는지, 방마다 따로 매기는지, 두 번 돌려도
 * 같은지. 마지막 것이 중요한 이유는 서버가 여러 대이거나 재시작하면 두 번 돌기
 * 때문이다.
 */
class MessageSequenceBackfillTest {

	private static MongoDBContainer mongo;
	private static MongoTemplate mongoTemplate;
	private static ChatMessageRepository repository;

	private MessageSequenceGenerator sequenceGenerator;
	private MessageSequenceBackfill backfill;

	@BeforeAll
	static void startMongo() {
		mongo = new MongoDBContainer("mongo:7.0");
		mongo.start();
		mongoTemplate = new MongoTemplate(
			new SimpleMongoClientDatabaseFactory(mongo.getConnectionString() + "/joying_backfill_test"));
		repository = new MongoRepositoryFactory(mongoTemplate).getRepository(ChatMessageRepository.class);
	}

	@AfterAll
	static void stopMongo() {
		if (mongo != null) {
			mongo.stop();
		}
	}

	@BeforeEach
	void clear() {
		mongoTemplate.dropCollection(ChatMessage.class);
		sequenceGenerator = mock(MessageSequenceGenerator.class);
		backfill = new MessageSequenceBackfill(repository, sequenceGenerator);
	}

	@Test
	@DisplayName("번호가 없던 메시지에 저장 시각 순서대로 번호가 매겨진다")
	void 번호가_없던_메시지에_번호를_채운다() {
		// 같은 밀리초에 저장된 것을 일부러 섞는다. 실제로 그런 문서들이 있다
		Instant base = Instant.parse("2025-11-01T00:00:00Z");
		saveWithoutSequence(1L, base);
		saveWithoutSequence(1L, base);
		saveWithoutSequence(1L, base.plusMillis(10));
		saveWithoutSequence(2L, base.plusMillis(5));
		saveWithoutSequence(2L, base.plusMillis(20));

		backfill.run(null);

		assertThat(repository.countBySequenceIsNull()).isZero();

		List<Long> room1 = sequencesOf(1L);
		List<Long> room2 = sequencesOf(2L);

		System.out.println("[측정] 방 1의 번호 = " + room1);
		System.out.println("[측정] 방 2의 번호 = " + room2);

		// 방마다 1부터 다시 매긴다. 번호는 방 안에서만 의미가 있다
		assertThat(room1).containsExactly(1L, 2L, 3L);
		assertThat(room2).containsExactly(1L, 2L);

		// 새 메시지가 뒤에 붙도록 방마다 시작값을 올려 둔다
		verify(sequenceGenerator).seedAtLeast(1L, 3L);
		verify(sequenceGenerator).seedAtLeast(2L, 2L);
	}

	@Test
	@DisplayName("두 번 돌려도 번호가 다시 매겨지지 않는다")
	void 두_번_돌려도_같다() {
		Instant base = Instant.parse("2025-11-01T00:00:00Z");
		for (int i = 0; i < 5; i++) {
			saveWithoutSequence(1L, base.plusMillis(i));
		}

		backfill.run(null);
		List<Long> first = sequencesOf(1L);

		backfill.run(null);
		List<Long> second = sequencesOf(1L);

		System.out.println("[측정] 첫 실행 = " + first + ", 두 번째 실행 = " + second);
		assertThat(second).isEqualTo(first);
	}

	@Test
	@DisplayName("이미 번호가 있는 메시지가 섞여 있으면 그 뒤에서 이어 붙는다")
	void 이미_번호가_있으면_이어_붙인다() {
		Instant base = Instant.parse("2025-11-01T00:00:00Z");

		// 번호를 도입한 뒤에 들어온 메시지. 이것보다 작은 번호를 다시 내주면 안 된다
		ChatMessage numbered = message(1L, base.plusMillis(100));
		numbered.assign(7L, null);
		repository.save(numbered);

		saveWithoutSequence(1L, base);
		saveWithoutSequence(1L, base.plusMillis(1));

		backfill.run(null);

		List<Long> all = sequencesOf(1L);
		System.out.println("[측정] 이어 붙인 뒤 번호 = " + all);

		assertThat(all).doesNotHaveDuplicates();
		assertThat(all).contains(7L, 8L, 9L);
		verify(sequenceGenerator).seedAtLeast(1L, 9L);
	}

	/** 방의 번호를 오름차순으로. 지운 것도 번호를 차지하므로 전부 본다 */
	private List<Long> sequencesOf(Long chatRoomId) {
		List<Long> sequences = new ArrayList<>();
		for (ChatMessage message : repository.findAll()) {
			if (chatRoomId.equals(message.getChatRoomId()) && message.getSequence() != null) {
				sequences.add(message.getSequence());
			}
		}
		sequences.sort(Comparator.naturalOrder());
		return sequences;
	}

	private void saveWithoutSequence(Long chatRoomId, Instant createdAt) {
		repository.save(message(chatRoomId, createdAt));
	}

	private ChatMessage message(Long chatRoomId, Instant createdAt) {
		ChatMessage message = ChatMessage.createTextMessage(chatRoomId, 100L, "옛날 메시지", null);
		message.setCreatedAt(createdAt);
		return message;
	}
}
