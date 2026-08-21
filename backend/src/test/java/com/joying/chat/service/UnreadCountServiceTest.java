package com.joying.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;

/**
 * 안읽음 개수의 현재 동작을 고정한다.
 *
 * <p>여기서 검증하는 것은 올바른 동작이 아니라 지금 동작이다. 실사에서 나온 결함이
 * 이미 몇 개 있지만 그것을 고치지 않는다. 고치면 무엇이 원래 동작이었는지 알 수 없게
 * 되고, 이관 뒤에 무엇이 깨졌는지도 못 가린다.
 *
 * <p>알고 있는 결함은 테스트 이름에 그대로 적어 둔다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UnreadCountServiceTest {

	private static final long ROOM_ID = 1L;
	private static final long MEMBER_ID = 100L;
	private static final String KEY = "unread:1:100";

	@Mock
	RedisTemplate<String, String> redis;

	@Mock
	ValueOperations<String, String> valueOps;

	@Mock
	ChatMessageRepository messageRepository;

	@Mock
	ChatRoomMemberRepository memberRepository;

	UnreadCountService service;

	@BeforeEach
	void setUp() {
		given(redis.opsForValue()).willReturn(valueOps);
		// 병렬 조회를 같은 스레드에서 바로 실행해 순서를 예측 가능하게 둔다
		service = new UnreadCountService(redis, messageRepository, memberRepository, Runnable::run);
	}

	@Test
	@DisplayName("증가하면 값을 올리고 만료를 다시 건다")
	void incrementRaisesAndRefreshesTtl() {
		service.increment(ROOM_ID, MEMBER_ID);

		verify(valueOps).increment(KEY);
		verify(redis).expire(eq(KEY), anyLong(), eq(TimeUnit.DAYS));
	}

	@Test
	@DisplayName("Redis가 죽어도 증가는 예외를 던지지 않는다. 메시지 저장을 되돌리지 않기 위해서다")
	void incrementSwallowsRedisFailure() {
		given(valueOps.increment(KEY)).willThrow(new RuntimeException("Redis 연결 실패"));

		service.increment(ROOM_ID, MEMBER_ID);
	}

	@Test
	@DisplayName("초기화하면 키를 지운다")
	void resetDeletesKey() {
		service.reset(ROOM_ID, MEMBER_ID);

		verify(redis).delete(KEY);
	}

	@Test
	@DisplayName("캐시에 값이 있으면 그 값을 그대로 돌려주고 저장소를 보지 않는다")
	void returnsCachedValueWithoutTouchingStores() {
		given(valueOps.get(KEY)).willReturn("7");

		assertThat(service.get(ROOM_ID, MEMBER_ID)).isEqualTo(7L);
		verify(memberRepository, never()).findByChatRoomIdAndMemberId(any(), any());
	}

	@Test
	@DisplayName("캐시가 비었고 방 멤버가 아니면 0이다")
	void returnsZeroWhenNotAMember() {
		given(valueOps.get(KEY)).willReturn(null);
		given(memberRepository.findByChatRoomIdAndMemberId(ROOM_ID, MEMBER_ID))
			.willReturn(Optional.empty());

		assertThat(service.get(ROOM_ID, MEMBER_ID)).isZero();
	}

	@Test
	@DisplayName("캐시가 비었으면 저장소에서 세되 본인이 보낸 것은 빼고 센다")
	void countsOnlyMessagesFromOthers() {
		Instant lastReadAt = Instant.parse("2026-01-01T00:00:00Z");
		ChatRoomMember member = org.mockito.Mockito.mock(ChatRoomMember.class);
		given(member.getLastReadAt()).willReturn(lastReadAt);

		given(valueOps.get(KEY)).willReturn(null);
		given(memberRepository.findByChatRoomIdAndMemberId(ROOM_ID, MEMBER_ID))
			.willReturn(Optional.of(member));
		given(messageRepository.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(
			ROOM_ID, lastReadAt, MEMBER_ID)).willReturn(3L);

		assertThat(service.get(ROOM_ID, MEMBER_ID)).isEqualTo(3L);
	}

	@Test
	@DisplayName("알려진 결함: 방을 한 번도 안 열었으면 쌓인 메시지가 있어도 0으로 본다")
	void knownDefectZeroWhenNeverOpened() {
		// 읽은 시각이 없으면 저장소를 보지 않고 0을 돌려준다. 방을 한 번도 안 연
		// 사람은 메시지가 아무리 쌓여도 배지가 0으로 보인다.
		//
		// 이관 중에 고치지 않는다. 지금 동작을 그대로 박아 두고, 이관이 끝난 뒤에
		// 이 테스트를 뒤집으면서 고친다.
		ChatRoomMember member = org.mockito.Mockito.mock(ChatRoomMember.class);
		given(member.getLastReadAt()).willReturn(null);

		given(valueOps.get(KEY)).willReturn(null);
		given(memberRepository.findByChatRoomIdAndMemberId(ROOM_ID, MEMBER_ID))
			.willReturn(Optional.of(member));

		assertThat(service.get(ROOM_ID, MEMBER_ID)).isZero();
		verify(messageRepository, never())
			.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(any(), any(), any());
	}
}
