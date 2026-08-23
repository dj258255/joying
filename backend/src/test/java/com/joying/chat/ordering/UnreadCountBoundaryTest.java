package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.repository.ChatMessageRepository;

/**
 * 읽은 지점을 시각으로 잡으면 경계에서 한 건이 어긋난다.
 *
 * <p>안읽음은 읽은 시각 이후를 센다. 그런데 같은 밀리초에 저장된 메시지가 여럿이면
 * 그중 어디까지 읽었는지를 시각으로 가릴 수 없다.
 *
 * <p>읽은 시각을 마지막으로 읽은 메시지의 시각으로 잡으면, 같은 시각에 저장된 다른
 * 메시지들이 "이후" 조건에서 빠진다. 읽지 않았는데 읽은 것으로 센다.
 *
 * <p>같은 밀리초에 메시지가 여럿 저장되는 것은 앞선 실험에서 확인했다. 8개 스레드로
 * 200건을 저장하면 시각만으로는 순서를 정할 수 없을 만큼 겹친다.
 */
class UnreadCountBoundaryTest {

	private static ChatMessageStore store;
	private static ChatMessageRepository repository;

	private static final long ROOM_ID = 1L;
	private static final long ME = 100L;
	private static final long OTHER = 200L;

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
	@DisplayName("같은 시각에 저장된 메시지가 경계에 걸리면 시각으로는 덜 센다")
	void 시각으로_세면_경계에서_덜_센다() {
		// 상대가 같은 밀리초에 세 건을 보냈다. 실제로 일어나는 일이다
		Instant sameMoment = Instant.parse("2026-08-01T00:00:00Z");
		save(1L, OTHER, sameMoment);
		save(2L, OTHER, sameMoment);
		save(3L, OTHER, sameMoment);
		// 그 뒤에 한 건 더
		save(4L, OTHER, sameMoment.plusMillis(10));

		// 내가 1번까지 읽었다. 읽은 지점을 그 메시지의 시각으로 잡는다
		Instant lastReadAt = sameMoment;

		long byTime = repository
			.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(ROOM_ID, lastReadAt, ME);
		long bySequence = repository
			.countByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanAndSenderIdNot(ROOM_ID, 1L, ME);

		System.out.println("[측정] 시각으로 센 안읽음 = " + byTime + ", 번호로 센 안읽음 = " + bySequence);

		// 안 읽은 것은 2·3·4번 세 건이다
		assertThat(bySequence).isEqualTo(3);
		// 시각으로 세면 같은 시각인 2·3번이 빠져 한 건만 센다
		assertThat(byTime).isEqualTo(1);
	}

	@Test
	@DisplayName("본인이 보낸 것은 번호로 셀 때도 빠진다")
	void 본인이_보낸_것은_빠진다() {
		Instant base = Instant.parse("2026-08-01T00:00:00Z");
		save(1L, OTHER, base);
		save(2L, ME, base.plusMillis(1));
		save(3L, OTHER, base.plusMillis(2));

		long unread = repository
			.countByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanAndSenderIdNot(ROOM_ID, 1L, ME);

		System.out.println("[측정] 내 것을 뺀 안읽음 = " + unread);
		assertThat(unread).isEqualTo(1);
	}

	@Test
	@DisplayName("한 번도 읽지 않았으면 방의 처음부터 센다")
	void 한_번도_안_읽었으면_전부_센다() {
		Instant base = Instant.parse("2026-08-01T00:00:00Z");
		save(1L, OTHER, base);
		save(2L, OTHER, base.plusMillis(1));
		save(3L, ME, base.plusMillis(2));

		// 읽은 지점이 없을 때는 0번보다 큰 것을 전부 센다
		long unread = repository
			.countByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanAndSenderIdNot(ROOM_ID, 0L, ME);

		System.out.println("[측정] 한 번도 안 읽었을 때 = " + unread);
		assertThat(unread).isEqualTo(2);
	}

	private void save(long sequence, long senderId, Instant createdAt) {
		ChatMessage message = ChatMessage.createTextMessage(ROOM_ID, senderId, "메시지 " + sequence, null);
		message.setCreatedAt(createdAt);
		message.assign(sequence, null);
		store.inTransaction(r -> r.save(message));
	}
}
