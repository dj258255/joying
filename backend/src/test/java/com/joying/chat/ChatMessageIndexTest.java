package com.joying.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.ordering.ChatMessageStore;
import com.joying.chat.repository.ChatMessageRepository;

/**
 * 제약이 실제로 걸려 있는지 확인한다.
 *
 * <p>문서 저장소를 쓰던 때 같은 자리에서 두 번 데었다. 인덱스를 만들 컬렉션 이름을
 * 문자열로 적어 두어 엔티티가 쓰는 이름과 어긋났고, 인덱스가 전부 빈 컬렉션에 붙어
 * 있었다. 그다음에는 {@code sparse} 로 유니크를 걸었는데 식별자 없는 두 건이 서로
 * 부딪혔다.
 *
 * <p>둘 다 <b>설정이 있다는 것만 보고 넘어가서</b> 생긴 일이다. 그래서 여기서는 설정을
 * 읽지 않고 실제로 넣어 본다. 두 번째 삽입이 막히면 제약이 살아 있는 것이고, 막히지
 * 않으면 이름이 무엇이든 걸려 있지 않은 것이다.
 */
class ChatMessageIndexTest {

	private static ChatMessageStore store;
	private static ChatMessageRepository repository;

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 100L;

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
	void clear() {
		store.clear();
	}

	@Test
	@DisplayName("같은 방에 같은 전송 식별자를 두 번 넣으면 두 번째가 막힌다")
	void 같은_식별자는_한_번만() {
		store.inTransaction(r -> r.saveAndFlush(message("dup-1")));

		assertThat(catchSaveFailure("dup-1"))
			.as("제약이 걸려 있으면 두 번째 삽입이 막힌다")
			.isTrue();
	}

	@Test
	@DisplayName("식별자가 없는 메시지는 여러 건이어도 막히지 않는다")
	void 식별자가_없으면_막히지_않는다() {
		// 조건 없이 유니크를 걸면 여기서 막힌다. 화면이 식별자를 붙이기 전에 만들어진
		// 메시지가 그렇고, 문서 저장소에서 sparse 로 걸었을 때 실제로 막혔다
		store.inTransaction(r -> r.saveAndFlush(message(null)));
		store.inTransaction(r -> r.saveAndFlush(message(null)));

		assertThat(countOf(r -> r.countByChatRoomId(ROOM_ID))).isEqualTo(2);
	}

	@Test
	@DisplayName("방이 다르면 같은 식별자를 써도 막히지 않는다")
	void 방이_다르면_막히지_않는다() {
		// 식별자는 화면이 만든다. 다른 사람이 다른 방에서 같은 값을 낼 수 있다
		store.inTransaction(r -> r.saveAndFlush(message(ROOM_ID, "same-id")));
		store.inTransaction(r -> r.saveAndFlush(message(ROOM_ID + 1, "same-id")));

		assertThat(countOf(r -> r.countByChatRoomId(ROOM_ID))).isEqualTo(1);
		assertThat(countOf(r -> r.countByChatRoomId(ROOM_ID + 1))).isEqualTo(1);
	}

	private boolean catchSaveFailure(String clientMessageId) {
		try {
			store.inTransaction(r -> r.saveAndFlush(message(clientMessageId)));
			return false;
		} catch (DataIntegrityViolationException e) {
			return true;
		}
	}

	private ChatMessage message(String clientMessageId) {
		return message(ROOM_ID, clientMessageId);
	}

	private ChatMessage message(long chatRoomId, String clientMessageId) {
		ChatMessage message = ChatMessage.createTextMessage(chatRoomId, SENDER_ID, "메시지", null);
		message.setCreatedAt(Instant.now());
		message.assign(System.nanoTime(), clientMessageId);
		return message;
	}

	/** 세는 조회는 트랜잭션 안에서 돌리고 값으로 꺼내 온다 */
	private long countOf(java.util.function.ToLongFunction<com.joying.chat.repository.ChatMessageRepository> work) {
		return store.read(r -> work.applyAsLong(r));
	}
}
