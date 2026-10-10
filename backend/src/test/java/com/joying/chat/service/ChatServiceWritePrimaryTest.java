package com.joying.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.Optional;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.dto.SendMessageRequest;
import com.joying.chat.metrics.ChatMetrics;
import com.joying.chat.migration.ChatStorageMigration;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.member.domain.Member;

/**
 * 정본이 새 DB 일 때의 저장 경로 (#123).
 *
 * <p>정본 교대 뒤에는 저장과 멱등 중재가 전부 새 DB 로 가야 한다. 옛 DB(JPA)로
 * 저장이 새면 두 DB 가 서로 다른 심판을 쓰게 되고, 같은 전송이 두 번 저장될 수 있다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatServiceWritePrimaryTest {

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
	@Mock ChatMessageService chatMessageService;
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
			chatMetrics, orderArbiter, storageMigration, chatMessageService);

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
		given(orderArbiter.inRoomOrder(eq(ROOM_ID), any())).willAnswer(
			inv -> ((Supplier<?>) inv.getArgument(1)).get());

		given(storageMigration.newPrimary()).willReturn(true);
	}

	private SendMessageRequest request(String clientMessageId) {
		return SendMessageRequest.builder()
			.type(MessageType.TEXT)
			.content("안녕하세요")
			.clientMessageId(clientMessageId)
			.build();
	}

	@Test
	@DisplayName("새 저장은 새 DB 로 가고 옛 DB(JPA)로는 가지 않는다")
	void newMessageGoesToNewPrimary() {
		given(storageMigration.findSavedTransfer(eq(ROOM_ID), anyString())).willReturn(null);
		given(storageMigration.insertPrimary(any(ChatMessage.class))).willReturn(true);

		service.sendMessage(ROOM_ID, SENDER_ID, request("send-1"));

		verify(storageMigration).insertPrimary(any(ChatMessage.class));
		verify(chatMessageRepository, never()).saveAndFlush(any());
		// 옛 DB 는 역방향 미러로 채워진다. 되돌림과 옛 DB 읽기가 사는 근거다
		verify(storageMigration).mirror(any(ChatMessage.class));
		verify(unreadCountService, times(1)).increment(ROOM_ID, RECEIVER_ID);
	}

	@Test
	@DisplayName("동시 재전송의 패자는 새 DB 의 유니크가 가려내고 안읽음을 올리지 않는다")
	void loserOfConcurrentInsertIsArbitratedByNewDb() {
		ChatMessage winner = ChatMessage.createTextMessage(ROOM_ID, SENDER_ID, "안녕하세요", null);
		winner.setCreatedAt(java.time.Instant.now());
		winner.assign(1L, "send-race");

		// 사전 조회는 비어 있었고(동시 진입), 삽입이 0행으로 돌아온다
		given(storageMigration.findSavedTransfer(ROOM_ID, "send-race"))
			.willReturn(null)
			.willReturn(winner);
		given(storageMigration.insertPrimary(any(ChatMessage.class))).willReturn(false);

		service.sendMessage(ROOM_ID, SENDER_ID, request("send-race"));

		verify(chatMessageRepository, never()).saveAndFlush(any());
		verify(chatMetrics).idempotentHit();
		verify(unreadCountService, never()).increment(anyLong(), anyLong());
	}

	@Test
	@DisplayName("재전송의 사전 조회도 새 DB 를 본다")
	void resendPreCheckReadsNewPrimary() {
		ChatMessage already = ChatMessage.createTextMessage(ROOM_ID, SENDER_ID, "안녕하세요", null);
		already.setCreatedAt(java.time.Instant.now());
		already.assign(1L, "send-2");
		given(storageMigration.findSavedTransfer(ROOM_ID, "send-2")).willReturn(already);

		service.sendMessage(ROOM_ID, SENDER_ID, request("send-2"));

		verify(chatMessageRepository, never())
			.findByChatRoomIdAndClientMessageId(anyLong(), anyString());
		verify(storageMigration, never()).insertPrimary(any());
		verify(unreadCountService, never()).increment(anyLong(), anyLong());
		// 발행은 멱등 히트에도 다시 한다. 첫 발행이 실패했을 수 있다
		verify(redisPubSubPublisher, times(1)).publish(any());
	}
}
