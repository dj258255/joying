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

import com.joying.chat.document.ChatMessage;
import com.joying.chat.repository.ChatMessageRepository;

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

	private static com.joying.chat.ordering.ChatMessageStore store;
	private static ChatMessageRepository repository;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 200L;

	@BeforeAll
	static void startStore() {
		store = new com.joying.chat.ordering.ChatMessageStore();
		repository = store.repository();
	}

	@AfterAll
	static void stopStore() {
		if (store != null) {
			store.close();
		}
	}

	@BeforeEach
	void clean() {
		store.clear();
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
			message.assign((long) (i + 1), null);
			saved.add(store.inTransaction(r -> r.saveAndFlush(message)));
		}
		return saved;
	}

	/**
	 * 이 번호 이후를 오래된 순으로.
	 *
	 * <p>커서가 시각에서 번호로 바뀌었다. 시각으로 잡으면 같은 밀리초에 저장된 것이
	 * 경계에서 빠진다. 저장소 메서드를 그대로 부른다. 질의를 테스트가 직접 만들면
	 * 저장소가 실제로 무엇을 돌려주는지가 아니라 테스트가 쓴 질의를 재게 된다.
	 */
	private List<ChatMessage> messagesAfter(long afterSequence, int limit) {
		return store.read(r -> r.findByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanOrderBySequenceAsc(
			ROOM_ID, afterSequence, PageRequest.of(0, limit)));
	}

	@Test
	@DisplayName("끊긴 사이에 온 것을 마지막으로 받은 시각 뒤로 전부 받는다")
	void receivesEverythingAfterTheLastSeen() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		List<ChatMessage> all = given(30, start);

		// 열 번째까지 받고 끊겼다고 본다
		long lastSeen = all.get(9).getSequence();

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

		List<ChatMessage> gap = messagesAfter(all.get(4).getSequence(), 100);

		assertThat(gap)
			.as("이미 화면에 있는 것을 또 주면 같은 말풍선이 두 번 뜬다")
			.isEmpty();
	}

	@Test
	@DisplayName("오래된 순으로 준다. 받는 쪽이 순서대로 이어붙일 수 있어야 한다")
	void returnsOldestFirst() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(10, start);

		List<ChatMessage> gap = messagesAfter(0L, 100);

		// 번호 커서에서 0 은 "아직 아무것도 못 받았다"는 뜻이라 첫 건부터 온다.
		// 시각 커서를 쓰던 때는 첫 메시지의 시각을 주어 그 다음부터 왔다
		assertThat(gap).extracting(ChatMessage::getContent)
			.startsWith("메시지 0", "메시지 1", "메시지 2");
	}

	@Test
	@DisplayName("한 번에 받는 양에 상한이 있다. 오래 꺼져 있었으면 나눠 받는다")
	void limitsHowMuchComesAtOnce() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(500, start);

		List<ChatMessage> firstBatch = messagesAfter(0L, 100);

		assertThat(firstBatch)
			.as("상한이 없으면 며칠 꺼 뒀던 사람이 한 번에 수천 건을 받는다")
			.hasSize(100);

		long nextCursor = firstBatch.get(firstBatch.size() - 1).getSequence();
		assertThat(messagesAfter(nextCursor, 100)).hasSize(100);
	}

	@Test
	@DisplayName("받은 지점을 모르면 어디서부터 달라고 할지 정할 수 없다")
	void withoutACursorTheGapCannotBeFilled() {
		Instant start = Instant.parse("2026-01-01T00:00:00Z");
		given(30, start);

		// 읽음 표시는 전달 표시가 아니다. 읽지 않았어도 받은 것은 받은 것이다.
		// 그래서 읽은 지점을 커서로 쓰면 이미 화면에 있는 것까지 다시 온다.
		long lastRead = 1L;

		assertThat(messagesAfter(lastRead, 100))
			.as("읽음 표시를 커서로 쓰면 이미 받은 것까지 다시 온다")
			.hasSize(29);
	}
}
