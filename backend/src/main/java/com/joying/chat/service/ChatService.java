package com.joying.chat.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.metrics.ChatMetrics;
import com.joying.chat.dto.ChatRoomSettingsResponse;
import com.joying.chat.dto.ChatRoomStatusEvent;
import com.joying.chat.dto.ChatRoomUpdateEvent;
import com.joying.chat.dto.SendMessageRequest;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.domain.Member;

/**
 * 메시지를 보내고 읽음을 처리한다.
 *
 * <p>보낸 뒤에 해야 할 일이 여럿이다. 저장하고, 실시간으로 내보내고, 안읽음을 올리고,
 * 알림을 보내고, 방 목록을 갱신한다. 이 중 보낸 사람이 기다려야 하는 것은 저장과
 * 실시간 전달뿐이다. 나머지는 늦어도 되므로 따로 돌린다.
 */
@Service
public class ChatService {

	private static final Logger log = LoggerFactory.getLogger(ChatService.class);

	private static final int TEXT_MAX_LENGTH = 500;

	/** 방 목록 갱신 집계가 대기 중인 (방:수신자). 몰린 송신의 집계를 하나로 접는다. */
	private final java.util.Set<String> pendingRoomUpdates =
		java.util.concurrent.ConcurrentHashMap.newKeySet();

	private final ChatRoomRepository chatRoomRepository;
	private final Executor queryExecutor;
	private final ChatRoomMemberRepository chatRoomMemberRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final RedisPubSubPublisher redisPubSubPublisher;
	private final UnreadCountService unreadCountService;
	private final ChatRoomPermissionCache permissionCache;
	private final WebPushService webPushService;
	private final ChatPresenceService chatPresenceService;
	private final ChatBroadcaster chatBroadcaster;
	private final MessageSequenceGenerator sequenceGenerator;
	private final ChatMetrics chatMetrics;
	private final RoomOrderArbiter orderArbiter;
	private final com.joying.chat.migration.ChatStorageMigration storageMigration;
	private final ChatMessageService chatMessageService;

	public ChatService(ChatRoomRepository chatRoomRepository,
					   @Qualifier("chatQueryExecutor") Executor queryExecutor,
					   ChatRoomMemberRepository chatRoomMemberRepository,
					   ChatMessageRepository chatMessageRepository,
					   RedisPubSubPublisher redisPubSubPublisher,
					   UnreadCountService unreadCountService,
					   ChatRoomPermissionCache permissionCache,
					   WebPushService webPushService,
					   ChatPresenceService chatPresenceService,
					   ChatBroadcaster chatBroadcaster,
					   MessageSequenceGenerator sequenceGenerator,
					   ChatMetrics chatMetrics,
					   RoomOrderArbiter orderArbiter,
					   com.joying.chat.migration.ChatStorageMigration storageMigration,
					   ChatMessageService chatMessageService) {
		this.chatRoomRepository = chatRoomRepository;
		this.queryExecutor = queryExecutor;
		this.chatRoomMemberRepository = chatRoomMemberRepository;
		this.chatMessageRepository = chatMessageRepository;
		this.redisPubSubPublisher = redisPubSubPublisher;
		this.unreadCountService = unreadCountService;
		this.permissionCache = permissionCache;
		this.webPushService = webPushService;
		this.chatPresenceService = chatPresenceService;
		this.chatBroadcaster = chatBroadcaster;
		this.sequenceGenerator = sequenceGenerator;
		this.chatMetrics = chatMetrics;
		this.orderArbiter = orderArbiter;
		this.storageMigration = storageMigration;
		this.chatMessageService = chatMessageService;
	}

	public ChatMessageResponse sendMessage(Long chatRoomId, Long senderId,
										   SendMessageRequest request) {
		if (request.getType() == MessageType.TEXT
			&& request.getContent().length() > TEXT_MAX_LENGTH) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "메시지는 500자를 초과할 수 없습니다");
		}

		if (!permissionCache.hasPermission(chatRoomId, senderId)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "메시지 전송 권한이 없습니다");
		}

		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		if (!chatRoom.isActive()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "종료된 채팅방입니다");
		}

		Long receiverId = otherSideOf(chatRoom, senderId);

		// 권한 캐시는 나갔는지를 보지 않는다. 그래서 여기서 따로 확인한다.
		requireNotLeft(chatRoomId, senderId, "나간 채팅방입니다. 먼저 재입장해주세요", ErrorCode.FORBIDDEN);
		requireNotLeft(chatRoomId, receiverId, "상대방이 나간 채팅방입니다", ErrorCode.INVALID_INPUT_VALUE);

		// 컷오버 순간의 쓰기 배리어. 평소에는 아무 일도 하지 않는다 (#105)
		storageMigration.awaitBarrier();

		// 번호 발급부터 발행까지가 순서를 정하는 구간이다. 중재 모드에서는 이 구간을
		// 방 단위 잠금으로 묶어, 노드가 달라도 발급 순서대로 발행되게 한다. 안읽음과
		// 알림은 순서와 무관하므로 잠금 밖에 둔다. 보유 시간을 저장과 발행만큼으로
		// 줄이기 위해서다.
		Sent sent = orderArbiter.inRoomOrder(chatRoomId, () -> {
			SavedOnce once = saveOnce(chatRoomId, senderId, request);
			ChatMessage saved = once.message();

			ChatMessage replyMessage = saved.getReplyToMessageId() == null ? null
				: chatMessageRepository.findById(saved.getReplyToMessageId()).orElse(null);

			// 받는 사람을 실어 보내면 받는 서버가 방을 다시 조회하지 않아도 된다
			ChatMessageResponse dto = ChatMessageResponse.from(saved, replyMessage)
				.toBuilder()
				.receiverId(receiverId)
				.build();

			// 멱등 히트여도 다시 발행한다. 재전송은 첫 발행이 실패했을 수 있다는
			// 신호이고, 받는 쪽은 메시지 id 로 중복을 걸러낸다
			redisPubSubPublisher.publish(dto);
			return new Sent(saved, dto, once.idempotentHit());
		});
		ChatMessage savedMessage = sent.saved();
		ChatMessageResponse messageDto = sent.dto();

		// 저장소 분리 이관의 이중 쓰기. 동기지만 잠금 밖이라 보유 시간에는 안 얹힌다 (#105)
		storageMigration.mirror(savedMessage);

		// 멱등 히트면 올리지 않는다. 저장은 1건인데 카운터만 2가 되던 자리다 (#99)
		if (!sent.idempotentHit()) {
			unreadCountService.increment(chatRoomId, receiverId);
		}

		log.info("메시지 전송 완료: messageId={}, chatRoomId={}, senderId={}",
			savedMessage.getId(), chatRoomId, senderId);

		// 알림은 늦어도 된다. 보낸 사람을 여기서 기다리게 하지 않는다.
		if (webPushService.isPushEnabled()) {
			runQuietly("푸시 알림 전송",
				() -> sendPushNotification(chatRoomId, receiverId, senderId, savedMessage));
		}

		// 방 목록에 보이는 마지막 메시지도 마찬가지다
		runQuietly("채팅방 마지막 메시지 갱신",
			() -> updateLastMessage(chatRoomId, savedMessage.getContent(),
				savedMessage.getCreatedAt()));

		// 방 목록의 배지 갱신도 곁작업이다. cursor 모드에서 이 조회는 집계 쿼리라,
		// 동기로 두면 보낸 사람이 바쁜 방의 집계를 기다린다(실측 전달 p95 1.3배).
		// 비동기로만 옮기면 몰린 송신이 집계 40개로 변해 커넥션 풀에서 저장과
		// 다툰다(실측 p95 1.6~2.7초). 배지는 상태라 마지막 값만 의미가 있으므로,
		// 같은 방 · 수신자로 집계가 이미 대기 중이면 새로 쌓지 않고 접는다
		String updateKey = chatRoomId + ":" + receiverId;
		if (pendingRoomUpdates.add(updateKey)) {
			runQuietly("방 목록 갱신 알림", () -> {
				// 실행에 들어가며 바로 비운다. 집계 중에 새 메시지가 오면 다음
				// 갱신이 다시 잡혀 마지막 값이 결국 나간다
				pendingRoomUpdates.remove(updateKey);
				long unreadCount = unreadCountService.get(chatRoomId, receiverId);
				chatBroadcaster.toUser(receiverId, "/queue/chatroom-update",
					ChatRoomUpdateEvent.builder()
						.chatRoomId(chatRoomId)
						.lastMessage(savedMessage.getContent())
						.lastMessageAt(savedMessage.getCreatedAt())
						.unreadCount(unreadCount)
						.build());
			});
		}

		return messageDto;
	}

	/**
	 * 읽음으로 표시한다.
	 *
	 * <p>세 곳을 갱신한다. 읽은 시각과 안읽음 개수는 바로 하고, 메시지 하나하나에
	 * 읽음 표시를 다는 것은 건수가 많을 수 있어 따로 돌린다.
	 */
	@Transactional
	public void markAsRead(Long chatRoomId, Long memberId) {
		ChatRoomMember chatRoomMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다"));

		// 읽은 지점을 방의 마지막 메시지 번호로 잡는다.
		//
		// 시각으로 잡으면 같은 밀리초에 저장된 메시지가 경계에서 빠진다. 상대가 같은
		// 순간에 세 건을 보내고 그중 첫 건의 시각을 기준으로 삼으면, 안 읽은 세 건이
		// 한 건으로 보인다.
		ChatMessage newest = chatMessageRepository
			.findFirstByChatRoomIdAndIsDeletedFalseOrderBySequenceDesc(chatRoomId);
		chatRoomMember.markAsRead(newest == null ? null : newest.getSequence(), Instant.now());

		unreadCountService.reset(chatRoomId, memberId);

		runQuietly("메시지 읽음 표시", () -> markMessagesRead(chatRoomId, memberId));
	}

	/**
	 * 상대가 보낸 것 중 아직 안 읽은 것에 읽음 표시를 단다.
	 *
	 * <p>갱신 쿼리는 트랜잭션이 걸리는 다른 빈(ChatMessageService)을 지난다. 이 자리는
	 * 비동기 스레드라 markAsRead 의 트랜잭션이 없고, 같은 빈 안에서 부르면
	 * TransactionRequiredException 으로 항상 조용히 실패했다 (#121).
	 */
	private void markMessagesRead(Long chatRoomId, Long memberId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId).orElse(null);
		if (chatRoom == null) {
			return;
		}

		long updated = chatMessageService
			.markMessagesReadFrom(chatRoomId, otherSideOf(chatRoom, memberId));

		log.debug("메시지 읽음 표시 완료: chatRoomId={}, memberId={}, count={}",
			chatRoomId, memberId, updated);
	}

	@Transactional
	public ChatRoomSettingsResponse updateSettings(Long chatRoomId, Long memberId,
												   Boolean isPinned, Boolean isMuted) {
		ChatRoomMember chatRoomMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다"));

		// 보내지 않은 것은 바꾸지 않는다
		if (isPinned != null && chatRoomMember.isPinned() != isPinned) {
			chatRoomMember.togglePin();
		}
		if (isMuted != null && chatRoomMember.isMuted() != isMuted) {
			chatRoomMember.toggleMute();
		}

		return ChatRoomSettingsResponse.builder()
			.isPinned(chatRoomMember.isPinned())
			.isMuted(chatRoomMember.isMuted())
			.build();
	}

	/**
	 * 나갔던 사람이 다시 들어온 것을 알린다.
	 */
	public void sendRejoinNotification(Long chatRoomId, Long memberId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		Member rejoining = memberId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getBuyer() : chatRoom.getSeller();
		Long receiverId = otherSideOf(chatRoom, memberId);

		ChatMessage systemMessage = ChatMessage.createSystemMessage(
			chatRoomId, rejoining.getNickname() + "님이 다시 들어왔습니다");
		systemMessage.setCreatedAt(Instant.now());
		ChatMessage savedMessage = chatMessageRepository.save(systemMessage);

		redisPubSubPublisher.publish(ChatMessageResponse.from(savedMessage, null)
			.toBuilder().receiverId(receiverId).build());

		chatBroadcaster.toUser(receiverId, "/queue/chatroom-status",
			ChatRoomStatusEvent.builder()
				.chatRoomId(chatRoomId)
				.eventType(ChatRoomStatusEvent.EventType.MEMBER_REJOINED)
				.memberId(memberId)
				.memberNickname(rejoining.getNickname())
				.build());
	}

	/**
	 * 알림을 보낸다.
	 *
	 * <p>보내지 않는 경우가 둘이다. 알림을 꺼 두었거나, 지금 이 방을 보고 있을 때다.
	 * 화면에 이미 떠 있는 것을 알림으로 또 알릴 이유가 없다.
	 *
	 * <p>웹소켓과 푸시를 둘 다 쓴다. 붙어 있으면 웹소켓이 먼저 닿고, 꺼져 있거나
	 * 백그라운드면 푸시가 받는다.
	 */
	private void sendPushNotification(Long chatRoomId, Long receiverId, Long senderId,
									  ChatMessage message) {
		ChatRoomMember receiverMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, receiverId).orElse(null);
		if (receiverMember == null || receiverMember.isMuted()) {
			return;
		}
		if (chatPresenceService.isViewingChatRoom(receiverId, chatRoomId)) {
			return;
		}

		// 프로필 이미지까지 미리 읽는다. 트랜잭션 밖이라 지연 로딩이 끊겨 있다.
		ChatRoom chatRoom = chatRoomRepository.findByIdWithProfileImages(chatRoomId).orElse(null);
		if (chatRoom == null) {
			return;
		}

		Member sender = senderId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getBuyer() : chatRoom.getSeller();

		String senderProfileUrl = sender.getProfileImage() != null
			? sender.getProfileImage().getDirectory() + "/" + sender.getProfileImage().getFileName()
			: sender.getKakaoProfileImageUrl();

		PushNotificationPayload payload =
			createPushPayload(sender.getNickname(), senderProfileUrl, message, chatRoomId);
		if (payload == null) {
			return;
		}

		Map<String, Object> notificationData = new HashMap<>();
		notificationData.put("type", "PUSH_NOTIFICATION");
		notificationData.put("title", payload.getTitle());
		notificationData.put("body", payload.getBody());
		notificationData.put("icon", payload.getIcon());
		notificationData.put("image", payload.getImage());
		notificationData.put("badge", payload.getBadge());
		notificationData.put("tag", payload.getTag());
		notificationData.put("data", payload.getData());
		chatBroadcaster.toUser(receiverId, "/queue/notifications", notificationData);

		webPushService.sendNotification(receiverId, payload);
	}

	/**
	 * 알림에 띄울 내용. 시스템 메시지는 알리지 않으므로 null.
	 */
	private PushNotificationPayload createPushPayload(String senderNickname,
													  String senderProfileUrl,
													  ChatMessage message, Long chatRoomId) {
		if (message.getType() == MessageType.SYSTEM) {
			return null;
		}

		// 같은 메시지의 알림이 여러 번 뜨지 않게 메시지마다 태그를 다르게 준다
		String tag = "message-" + message.getId();
		Map<String, Object> data = Map.of(
			"chatRoomId", chatRoomId,
			"messageId", message.getId() == null ? "" : message.getId(),
			"url", "/chats/" + chatRoomId);

		return switch (message.getType()) {
			case IMAGE -> PushNotificationPayload.builder()
				.title(senderNickname + "님이 사진을 보냈습니다")
				.body("이미지 1장")
				.icon(senderProfileUrl)
				.image(message.getImageUrl())
				.tag(tag).data(data).build();
			case FILE -> PushNotificationPayload.builder()
				.title(senderNickname + "님이 파일을 보냈습니다")
				.body(message.getFileName() + " (" + humanReadableSize(message.getFileSize()) + ")")
				.icon(senderProfileUrl)
				.tag(tag).data(data).build();
			default -> PushNotificationPayload.builder()
				.title(senderNickname + "님의 메시지")
				.body(message.getContent())
				.icon(senderProfileUrl)
				.tag(tag).data(data).build();
		};
	}

	private String humanReadableSize(Long size) {
		if (size == null) {
			return "";
		}
		if (size < 1024) {
			return size + " B";
		}
		if (size < 1024 * 1024) {
			return (size / 1024) + " KB";
		}
		return (size / (1024 * 1024)) + " MB";
	}

	/** 잠금 구간이 돌려줄 값. 저장본은 뒤처리(알림, 방 목록)에, dto 는 응답에 쓴다. */
	private record Sent(ChatMessage saved, ChatMessageResponse dto, boolean idempotentHit) {
	}

	/** 저장 결과와 그것이 새 저장인지 멱등 히트인지. 히트면 안읽음을 올리지 않는다. */
	private record SavedOnce(ChatMessage message, boolean idempotentHit) {
	}

	/**
	 * 한 번만 저장한다.
	 *
	 * <p>같은 전송 식별자가 이미 있으면 그때 저장한 것을 그대로 돌려준다. 발행이
	 * 실패해 사용자가 다시 보내도 문서가 두 개 생기지 않는다.
	 *
	 * <p>먼저 조회해 확인하는 것만으로는 부족하다. 동시에 들어온 두 요청이 둘 다
	 * 없다고 읽고 둘 다 넣는다. 그래서 판정을 저장소의 유니크 제약에 맡기고, 걸리면
	 * 그때 다시 읽는다.
	 */
	private SavedOnce saveOnce(Long chatRoomId, Long senderId, SendMessageRequest request) {
		String clientMessageId = request.getClientMessageId();

		if (clientMessageId != null) {
			ChatMessage already = chatMessageRepository
				.findByChatRoomIdAndClientMessageId(chatRoomId, clientMessageId).orElse(null);
			if (already != null) {
				log.info("이미 저장된 전송이다: chatRoomId={}, clientMessageId={}",
					chatRoomId, clientMessageId);
				chatMetrics.idempotentHit();
				return new SavedOnce(already, true);
			}
		}

		ChatMessage chatMessage = buildMessage(chatRoomId, senderId, request);
		chatMessage.setCreatedAt(Instant.now());
		// 순서를 정하는 것은 시각이 아니라 이 번호다
		long sequence;
		try {
			sequence = sequenceGenerator.next(chatRoomId);
		} catch (RuntimeException e) {
			// 번호를 못 받으면 저장하지 않는다. 이 값이 오르면 메시지가 저장되지 않고
			// 있다는 뜻이라 바로 보여야 한다
			chatMetrics.sequenceFailure();
			throw e;
		}
		chatMessage.assign(sequence, clientMessageId);

		try {
			// 바로 밀어 넣어야 제약 위반이 여기서 잡힌다. save 만 부르면 트랜잭션이
			// 끝날 때 터지고, 그때는 이 자리를 이미 지나쳤다
			return new SavedOnce(chatMessageRepository.saveAndFlush(chatMessage), false);
		} catch (DataIntegrityViolationException e) {
			// 같은 전송이 동시에 들어와 다른 쪽이 먼저 넣었다. 먼저 넣은 쪽이 안읽음을
			// 올리므로 이쪽도 멱등 히트다.
			//
			// 이 메서드에 트랜잭션이 걸려 있지 않은 것이 여기서 중요하다. 저장소 호출마다
			// 트랜잭션이 따로 열리므로, 실패한 flush 가 이 뒤의 조회를 망치지 않는다.
			// 한 트랜잭션 안이었다면 영속성 컨텍스트가 망가져 다시 조회할 수 없다.
			chatMetrics.idempotentHit();
			return new SavedOnce(chatMessageRepository
				.findByChatRoomIdAndClientMessageId(chatRoomId, clientMessageId)
				.orElseThrow(() -> e), true);
		}
	}

	/**
	 * 종류에 맞는 메시지를 만든다.
	 *
	 * <p>이미지와 파일은 주소가 없으면 만들 수 없다. 없는 채로 저장하면 상대 화면에
	 * 빈 말풍선이 뜬다.
	 */
	private ChatMessage buildMessage(Long chatRoomId, Long senderId, SendMessageRequest request) {
		return switch (request.getType()) {
			case IMAGE -> ChatMessage.createImageMessage(chatRoomId, senderId,
				require(request.getImageUrl(), "이미지 URL이 필요합니다"),
				request.getFileName() == null ? "image.jpg" : request.getFileName(),
				request.getFileSize() == null ? 0L : request.getFileSize(),
				request.getReplyToMessageId());
			case FILE -> ChatMessage.createFileMessage(chatRoomId, senderId,
				require(request.getFileUrl(), "파일 URL이 필요합니다"),
				request.getFileName() == null ? "file" : request.getFileName(),
				request.getFileSize() == null ? 0L : request.getFileSize(),
				request.getReplyToMessageId());
			case SYSTEM -> ChatMessage.createSystemMessage(chatRoomId, request.getContent());
			default -> ChatMessage.createTextMessage(chatRoomId, senderId,
				request.getContent(), request.getReplyToMessageId());
		};
	}

	private String require(String value, String message) {
		if (value == null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, message);
		}
		return value;
	}

	private void updateLastMessage(Long chatRoomId, String content, Instant createdAt) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId).orElse(null);
		if (chatRoom == null) {
			return;
		}
		chatRoom.updateLastMessage(content, createdAt);
		chatRoomRepository.save(chatRoom);
	}

	private Long otherSideOf(ChatRoom chatRoom, Long memberId) {
		return memberId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getSeller().getMemberId()
			: chatRoom.getBuyer().getMemberId();
	}

	private void requireNotLeft(Long chatRoomId, Long memberId, String message, ErrorCode code) {
		ChatRoomMember member = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId).orElse(null);
		if (member != null && member.isLeft()) {
			throw new BusinessException(code, message);
		}
	}

	/**
	 * 늦어도 되는 곁작업을 따로 돌린다.
	 *
	 * <p>실패해도 메시지 전송을 되돌리지 않는다. 알림이 한 번 빠지는 것과 메시지가
	 * 사라지는 것은 값이 다르다.
	 */
	private void runQuietly(String what, Runnable task) {
		queryExecutor.execute(() -> {
			try {
				task.run();
			} catch (Exception e) {
				log.error("{} 실패: {}", what, e.getMessage(), e);
			}
		});
	}
}
