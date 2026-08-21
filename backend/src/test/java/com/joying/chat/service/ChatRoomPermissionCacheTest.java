package com.joying.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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

import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.domain.ChatRoomStatus;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.member.domain.Member;

/**
 * 채팅방 권한 캐시의 현재 동작을 고정한다.
 *
 * <p>실사에서 결함이 나온 자리라 특히 조심해서 박아 둔다. 캐시가 무엇을 근거로
 * 판정하는지, 무엇을 보지 않는지를 테스트가 그대로 드러내게 썼다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatRoomPermissionCacheTest {

	private static final long ROOM_ID = 1L;
	private static final long BUYER_ID = 100L;
	private static final long SELLER_ID = 200L;
	private static final long STRANGER_ID = 999L;

	@Mock
	RedisTemplate<String, String> redis;

	@Mock
	ValueOperations<String, String> valueOps;

	@Mock
	ChatRoomRepository chatRoomRepository;

	@Mock
	ChatRoomMemberRepository chatRoomMemberRepository;

	ChatRoomPermissionCache cache;

	@BeforeEach
	void setUp() {
		given(redis.opsForValue()).willReturn(valueOps);
		cache = new ChatRoomPermissionCache(redis, chatRoomRepository, chatRoomMemberRepository);
	}

	/** 방에 남아 있는 참여자 */
	private void memberStaying(long memberId) {
		ChatRoomMember member = mock(ChatRoomMember.class);
		given(member.isLeft()).willReturn(false);
		given(chatRoomMemberRepository.findByChatRoomIdAndMemberId(ROOM_ID, memberId))
			.willReturn(Optional.of(member));
	}

	/** 방을 나간 참여자 */
	private void memberLeft(long memberId) {
		ChatRoomMember member = mock(ChatRoomMember.class);
		given(member.isLeft()).willReturn(true);
		given(chatRoomMemberRepository.findByChatRoomIdAndMemberId(ROOM_ID, memberId))
			.willReturn(Optional.of(member));
	}

	private String key(long memberId) {
		return "chatroom:permission:" + ROOM_ID + ":" + memberId;
	}

	private ChatRoom roomWith(long buyerId, long sellerId) {
		Member buyer = mock(Member.class);
		Member seller = mock(Member.class);
		given(buyer.getMemberId()).willReturn(buyerId);
		given(seller.getMemberId()).willReturn(sellerId);

		ChatRoom room = mock(ChatRoom.class);
		given(room.getBuyer()).willReturn(buyer);
		given(room.getSeller()).willReturn(seller);
		given(room.getStatus()).willReturn(ChatRoomStatus.ACTIVE);
		return room;
	}

	@Test
	@DisplayName("캐시에 ALLOWED가 있으면 저장소를 보지 않는다")
	void cacheHitSkipsDatabase() {
		given(valueOps.get(key(BUYER_ID))).willReturn("ALLOWED");

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isTrue();
		verify(chatRoomRepository, never()).findById(any());
	}

	@Test
	@DisplayName("캐시에 DENIED가 있으면 거절이다")
	void cachedDenialIsHonored() {
		given(valueOps.get(key(STRANGER_ID))).willReturn("DENIED");

		assertThat(cache.hasPermission(ROOM_ID, STRANGER_ID)).isFalse();
		verify(chatRoomRepository, never()).findById(any());
	}

	@Test
	@DisplayName("캐시가 비었으면 저장소를 보고 결과를 캐싱한다")
	void cacheMissChecksDatabaseAndCaches() {
		ChatRoom room = roomWith(BUYER_ID, SELLER_ID);
		given(valueOps.get(key(BUYER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(room));
		memberStaying(BUYER_ID);

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isTrue();
		verify(valueOps).set(eq(key(BUYER_ID)), eq("ALLOWED"), anyLong(), eq(TimeUnit.HOURS));
	}

	@Test
	@DisplayName("방에 없는 사람은 거절이고 그것도 캐싱한다")
	void strangerIsDeniedAndCached() {
		ChatRoom room = roomWith(BUYER_ID, SELLER_ID);
		given(valueOps.get(key(STRANGER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(room));

		assertThat(cache.hasPermission(ROOM_ID, STRANGER_ID)).isFalse();
		verify(valueOps).set(eq(key(STRANGER_ID)), eq("DENIED"), anyLong(), eq(TimeUnit.HOURS));
	}

	@Test
	@DisplayName("방이 없으면 거절이다")
	void missingRoomIsDenied() {
		given(valueOps.get(key(BUYER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.empty());

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isFalse();
	}

	@Test
	@DisplayName("방을 나간 사람은 거절한다. 무효화가 결과를 바꿀 수 있어야 한다")
	void deniesMemberWhoLeft() {
		// 예전에는 방의 구매자이거나 판매자인가만 봤다. 그래서 나가기에서 캐시를
		// 지워도 다음 조회가 같은 근거로 다시 허용을 계산해 캐싱했다. 무효화가
		// 결과를 바꿀 수 없다는 뜻이었다.
		ChatRoom room = roomWith(BUYER_ID, SELLER_ID);
		given(valueOps.get(key(BUYER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(room));
		memberLeft(BUYER_ID);

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isFalse();
		verify(valueOps).set(eq(key(BUYER_ID)), eq("DENIED"), anyLong(), eq(TimeUnit.HOURS));
	}

	@Test
	@DisplayName("참여자 기록이 없으면 거절한다")
	void deniesWhenNoMembershipRecord() {
		ChatRoom room = roomWith(BUYER_ID, SELLER_ID);
		given(valueOps.get(key(BUYER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(room));
		given(chatRoomMemberRepository.findByChatRoomIdAndMemberId(ROOM_ID, BUYER_ID))
			.willReturn(Optional.empty());

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isFalse();
	}

	@Test
	@DisplayName("닫힌 방은 거절한다")
	void deniesClosedRoom() {
		ChatRoom room = roomWith(BUYER_ID, SELLER_ID);
		given(room.getStatus()).willReturn(ChatRoomStatus.CLOSED);
		given(valueOps.get(key(BUYER_ID))).willReturn(null);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(room));

		assertThat(cache.hasPermission(ROOM_ID, BUYER_ID)).isFalse();
	}
}
