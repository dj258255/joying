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
import org.springframework.dao.DataIntegrityViolationException;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.repository.ChatMessageRepository;

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

	private static ChatMessageStore store;
	private static ChatMessageRepository repository;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 100L;

	private final AtomicLong sequence = new AtomicLong();

	@BeforeAll
	static void startStore() {
		store = new ChatMessageStore();
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
		// 인덱스는 저장소를 세울 때 한 번만 만든다. 문서 저장소를 쓰던 때는 컬렉션을
		// 지우면 인덱스도 사라져 매번 다시 걸어야 했다
		store.clear();
	}

	private ChatMessage save(String clientMessageId) {
		ChatMessage message = ChatMessage.createTextMessage(ROOM_ID, SENDER_ID, "안녕하세요", null);
		message.setCreatedAt(Instant.now());
		message.assign(sequence.incrementAndGet(), clientMessageId);
		return store.inTransaction(r -> r.saveAndFlush(message));
	}

	private long countInRoom() {
		return store.read(r -> (Long) r.countByChatRoomId(ROOM_ID));
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
		} catch (DataIntegrityViolationException e) {
			// 관계형에서는 이 예외로 온다. 문서 저장소를 쓰던 때는 DuplicateKeyException
			// 이었는데, 둘 다 스프링이 저장소 예외를 옮겨 준 것이라 이름만 다르다
			return true;
		}
	}
}
