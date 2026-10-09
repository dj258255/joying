package com.joying.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.dto.SendMessageRequest;
import com.joying.chat.metrics.ChatMetrics;
import com.joying.chat.migration.ChatStorageMigration;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.member.domain.Member;

/**
 * 멱등 재전송이 안읽음을 두 번 올리지 않는지 잰다 (#99).
 *
 * <p>저장은 유니크 제약으로 1건인데 카운터 증가는 전송 횟수만큼 돌던 자리다.
 * 재전송은 네트워크가 나쁠수록 흔하므로, 이 어긋남은 가장 안 좋은 조건에서 가장
 * 자주 생긴다.
 *
 * <p>발행은 멱등 히트에도 다시 한다. 재전송은 첫 발행이 실패했을 수 있다는 신호고,
 * 받는 쪽이 메시지 id 로 걸러낸다. 그래서 여기서는 발행 2회를 함께 단언한다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatServiceUnreadIdempotencyTest {

	private static final long ROOM_ID = 1L;
	private static final long SENDER_ID = 100L;
	private static final long RECEIVER_ID = 200L;

	@Mock ChatRoomRepository chatRoomRepository;
	@Mock ChatRoomMemberRepository chatRoomMemberRepository;
	@Mock ChatMessageRepository chatMessageRepository;
	@Mock RedisPubSubPublisher redisPubSubPublisher;
	@Mock UnreadCountService unreadCountService;
	@Mock ChatRoomPermissionCache permissionCache;
	@Mock WebPushService webPushService;
	@Mock ChatPresenceService chatPresenceService;
	@Mock ChatBroadcaster chatBroadcaster;
	@Mock MessageSequenceGenerator sequenceGenerator;
	@Mock ChatMetrics chatMetrics;
	@Mock RoomOrderArbiter orderArbiter;
	@Mock ChatStorageMigration storageMigration;
	@Mock ChatRoom chatRoom;
	@Mock Member buyer;
	@Mock Member seller;
	@Mock ChatRoomMember roomMember;

	ChatService service;

	@BeforeEach
	void setUp() {
		service = new ChatService(chatRoomRepository, Runnable::run, chatRoomMemberRepository,
			chatMessageRepository, redisPubSubPublisher, unreadCountService, permissionCache,
			webPushService, chatPresenceService, chatBroadcaster, sequenceGenerator,
			chatMetrics, orderArbiter, storageMigration);

		given(permissionCache.hasPermission(ROOM_ID, SENDER_ID)).willReturn(true);
		given(buyer.getMemberId()).willReturn(SENDER_ID);
		given(seller.getMemberId()).willReturn(RECEIVER_ID);
		given(chatRoom.isActive()).willReturn(true);
		given(chatRoom.getBuyer()).willReturn(buyer);
		given(chatRoom.getSeller()).willReturn(seller);
		given(chatRoomRepository.findById(ROOM_ID)).willReturn(Optional.of(chatRoom));
		given(roomMember.isLeft()).willReturn(false);
		given(chatRoomMemberRepository.findByChatRoomIdAndMemberId(eq(ROOM_ID), anyLong()))
			.willReturn(Optional.of(roomMember));
		given(sequenceGenerator.next(ROOM_ID)).willReturn(1L);
		given(webPushService.isPushEnabled()).willReturn(false);
		// 잠금 구간은 들어온 일을 그대로 실행한다. 여기서 재는 것은 잠금이 아니다
		given(orderArbiter.inRoomOrder(eq(ROOM_ID), any())).willAnswer(
			inv -> ((Supplier<?>) inv.getArgument(1)).get());
	}

	private SendMessageRequest request(String clientMessageId) {
		return SendMessageRequest.builder()
			.type(MessageType.TEXT)
			.content("안녕하세요")
			.clientMessageId(clientMessageId)
			.build();
	}

	@Test
	@DisplayName("같은 전송 식별자로 두 번 보내면 안읽음은 한 번만 오른다")
	void resendDoesNotIncrementUnreadTwice() {
		ChatMessage[] saved = new ChatMessage[1];
		given(chatMessageRepository.findByChatRoomIdAndClientMessageId(ROOM_ID, "send-1"))
			.willAnswer(inv -> Optional.ofNullable(saved[0]));
		given(chatMessageRepository.saveAndFlush(any(ChatMessage.class))).willAnswer(inv -> {
			saved[0] = inv.getArgument(0);
			return saved[0];
		});

		ChatMessageResponse first = service.sendMessage(ROOM_ID, SENDER_ID, request("send-1"));
		ChatMessageResponse second = service.sendMessage(ROOM_ID, SENDER_ID, request("send-1"));

		assertThat(second.getSequence()).isEqualTo(first.getSequence());
		verify(unreadCountService, times(1)).increment(ROOM_ID, RECEIVER_ID);
		// 발행은 두 번이 맞다. 첫 발행이 실패해 다시 보냈을 수 있다
		verify(redisPubSubPublisher, times(2)).publish(any());
	}

	@Test
	@DisplayName("같은 식별자가 동시에 들어와 제약에 걸린 쪽도 안읽음을 올리지 않는다")
	void loserOfConcurrentInsertDoesNotIncrement() {
		ChatMessage winner = ChatMessage.createTextMessage(ROOM_ID, SENDER_ID, "안녕하세요", null);
		winner.setCreatedAt(java.time.Instant.now());
		winner.assign(1L, "send-race");

		// 사전 조회는 둘 다 비어 있었고(동시 진입), 이쪽의 저장이 제약에 걸린다
		AtomicInteger finds = new AtomicInteger();
		given(chatMessageRepository.findByChatRoomIdAndClientMessageId(ROOM_ID, "send-race"))
			.willAnswer(inv -> finds.getAndIncrement() == 0
				? Optional.empty() : Optional.of(winner));
		given(chatMessageRepository.saveAndFlush(any(ChatMessage.class)))
			.willThrow(new DataIntegrityViolationException("duplicate key"));

		service.sendMessage(ROOM_ID, SENDER_ID, request("send-race"));

		verify(unreadCountService, times(0)).increment(anyLong(), anyLong());
	}
}
