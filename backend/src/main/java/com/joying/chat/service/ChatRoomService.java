package com.joying.chat.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.document.ChatMessage;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.domain.ChatRoomStatus;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.dto.ChatRoomMemberResponse;
import com.joying.chat.dto.ChatRoomResponse;
import com.joying.chat.dto.ChatRoomStatusEvent;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.file.component.FileUrlResolver;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.product.domain.Product;
import com.joying.file.repository.ProductFileRepository;
import com.joying.product.repository.ProductRepository;

/**
 * 채팅방을 만들고 목록과 상세를 준다.
 *
 * <p>방은 상품 하나에 대해 사는 사람과 파는 사람 사이에 하나만 생긴다. 나가도 방은
 * 남고, 메시지를 다시 보내면 다시 들어온 것으로 본다.
 */
@Service
public class ChatRoomService {

	private static final Logger log = LoggerFactory.getLogger(ChatRoomService.class);

	private static final String DELETED_PRODUCT = "삭제된 상품";
	private static final String DEFAULT_PROFILE_IMAGE = "/images/default_profile_image.png";
	private static final long AUTO_CLOSE_AFTER_SECONDS = 30L * 24 * 60 * 60;

	private final ChatRoomRepository chatRoomRepository;
	private final ChatRoomMemberRepository chatRoomMemberRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final MemberRepository memberRepository;
	private final ProductRepository productRepository;
	private final ChatPresenceService chatPresenceService;
	private final UnreadCountService unreadCountService;
	private final Executor queryExecutor;
	private final ProductFileRepository productFileRepository;
	private final FileUrlResolver fileUrlResolver;
	private final ChatRoomPermissionCache permissionCache;
	private final ChatBroadcaster chatBroadcaster;
	private final RedisPubSubPublisher redisPubSubPublisher;

	public ChatRoomService(ChatRoomRepository chatRoomRepository,
						   ChatRoomMemberRepository chatRoomMemberRepository,
						   ChatMessageRepository chatMessageRepository,
						   MemberRepository memberRepository,
						   ProductRepository productRepository,
						   ChatPresenceService chatPresenceService,
						   UnreadCountService unreadCountService,
						   @Qualifier("chatQueryExecutor") Executor queryExecutor,
						   ProductFileRepository productFileRepository,
						   FileUrlResolver fileUrlResolver,
						   ChatRoomPermissionCache permissionCache,
						   ChatBroadcaster chatBroadcaster,
						   RedisPubSubPublisher redisPubSubPublisher) {
		this.chatRoomRepository = chatRoomRepository;
		this.chatRoomMemberRepository = chatRoomMemberRepository;
		this.chatMessageRepository = chatMessageRepository;
		this.memberRepository = memberRepository;
		this.productRepository = productRepository;
		this.chatPresenceService = chatPresenceService;
		this.unreadCountService = unreadCountService;
		this.queryExecutor = queryExecutor;
		this.productFileRepository = productFileRepository;
		this.fileUrlResolver = fileUrlResolver;
		this.permissionCache = permissionCache;
		this.chatBroadcaster = chatBroadcaster;
		this.redisPubSubPublisher = redisPubSubPublisher;
	}

	/**
	 * 방을 가져오거나 없으면 만든다.
	 *
	 * <p>같은 짝은 방을 하나만 갖는다. 닫혀 있으면 다시 열고, 나간 사람이 있으면
	 * 다시 들어오게 한다.
	 */
	@Transactional
	public ChatRoom getOrCreateChatRoom(Long productId, Long requestMemberId) {
		Product product = productRepository.findById(productId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "상품을 찾을 수 없습니다"));

		Member requestMember = memberRepository.findById(requestMemberId)
			.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

		Member seller = product.getWriter();
		if (requestMember.getMemberId().equals(seller.getMemberId())) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "본인 상품에는 채팅을 보낼 수 없습니다");
		}

		return chatRoomRepository.findByProductAndBuyerAndSeller(product, requestMember, seller)
			.map(chatRoom -> reopenIfNeeded(chatRoom, requestMemberId))
			.orElseGet(() -> createChatRoom(product, requestMember, seller));
	}

	private ChatRoom reopenIfNeeded(ChatRoom chatRoom, Long requestMemberId) {
		if (!chatRoom.isActive()) {
			chatRoom.reopen();
		}

		Long chatRoomId = chatRoom.getChatRoomId();

		// 요청한 사람이 나갔던 상태면 다시 들어오고, 상대에게 알린다
		rejoinIfLeft(chatRoomId, requestMemberId, true);

		// 상대도 나갔으면 함께 되돌린다. 한쪽만 들어와 있으면 메시지를 보낼 수 없다.
		rejoinIfLeft(chatRoomId, otherSideOf(chatRoom, requestMemberId), false);

		return chatRoom;
	}

	private void rejoinIfLeft(Long chatRoomId, Long memberId, boolean notify) {
		ChatRoomMember record = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId).orElse(null);
		if (record == null || !record.isLeft()) {
			return;
		}
		record.rejoin();
		if (notify) {
			runQuietly("재입장 알림 전송", () -> sendRejoinNotification(chatRoomId, memberId));
		}
	}

	private ChatRoom createChatRoom(Product product, Member buyer, Member seller) {
		ChatRoom savedChatRoom = chatRoomRepository.save(new ChatRoom(product, buyer, seller));

		chatRoomMemberRepository.save(new ChatRoomMember(savedChatRoom, buyer));
		chatRoomMemberRepository.save(new ChatRoomMember(savedChatRoom, seller));

		log.info("채팅방 생성 완료: chatRoomId={}, productId={}, buyerId={}, sellerId={}",
			savedChatRoom.getChatRoomId(), product.getProductId(),
			buyer.getMemberId(), seller.getMemberId());

		// 첫 메시지에서 조회가 나가지 않도록 권한을 미리 넣어 둔다
		runQuietly("권한 캐시 미리 채우기",
			() -> permissionCache.warmupPermissions(savedChatRoom.getChatRoomId()));

		return savedChatRoom;
	}

	/**
	 * 방을 만들고 응답까지 만들어 돌려준다.
	 *
	 * <p>컨트롤러에서 만들면 트랜잭션이 끝난 뒤라 지연 로딩이 끊겨 있다.
	 */
	@Transactional
	public ChatRoomResponse getOrCreateChatRoomResponse(Long productId, Long buyerId) {
		ChatRoom chatRoom = getOrCreateChatRoom(productId, buyerId);
		ChatRoomMember myMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoom.getChatRoomId(), buyerId).orElse(null);

		return baseResponse(chatRoom, otherMemberOf(chatRoom, buyerId), myMember)
			.productImageUrl(getProductThumbnailUrl(chatRoom.getProduct()))
			.unreadCount(0L)
			.build();
	}

	public List<ChatRoomResponse> getMyChatRooms(Long memberId, boolean includeMember) {
		List<ChatRoom> chatRooms = chatRoomRepository.findByMemberId(memberId);
		if (chatRooms.isEmpty()) {
			return List.of();
		}

		// 방마다 따로 묻지 않고 한 번에 모아 온다. 방 수만큼 쿼리가 나가는 것을 막는다.
		Map<Long, ChatRoomMember> settingsByRoom = chatRoomMemberRepository.findByMemberId(memberId)
			.stream()
			.collect(Collectors.toMap(ChatRoomMember::getChatRoomId, Function.identity(), (a, b) -> a));

		Map<Long, Long> unreadCounts = unreadCountService.getBatch(
			chatRooms.stream().map(ChatRoom::getChatRoomId).toList(), memberId);

		Map<Long, String> thumbnails = thumbnailsOf(chatRooms);

		return chatRooms.stream().map(chatRoom -> {
			ChatRoomMember settings = settingsByRoom.get(chatRoom.getChatRoomId());
			if (settings == null) {
				throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다");
			}
			Member otherMember = otherMemberOf(chatRoom, memberId);

			return baseResponse(chatRoom, otherMember, settings)
				.productImageUrl(chatRoom.getProduct() == null ? null
					: thumbnails.get(chatRoom.getProduct().getProductId()))
				.unreadCount(unreadCounts.getOrDefault(chatRoom.getChatRoomId(), 0L))
				.member(includeMember ? presenceOf(otherMember) : null)
				.build();
		}).toList();
	}

	public ChatRoomResponse getChatRoomDetail(Long chatRoomId, Long memberId,
											  boolean includeMember) {
		ChatRoom chatRoom = chatRoomRepository.findByIdWithFetchJoin(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		requireParticipant(chatRoom, memberId);

		// 설정과 안읽음은 서로 의존하지 않으므로 동시에 조회한다
		CompletableFuture<ChatRoomMember> settingsFuture = CompletableFuture.supplyAsync(
			() -> chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
				.orElseThrow(() -> new BusinessException(
					ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다")),
			queryExecutor);
		CompletableFuture<Long> unreadFuture = CompletableFuture.supplyAsync(
			() -> unreadCountService.get(chatRoomId, memberId), queryExecutor);

		ChatRoomMember settings = settingsFuture.join();
		Member otherMember = otherMemberOf(chatRoom, memberId);

		return baseResponse(chatRoom, otherMember, settings)
			.productImageUrl(getProductThumbnailUrl(chatRoom.getProduct()))
			.unreadCount(unreadFuture.join())
			.member(includeMember ? presenceOf(otherMember) : null)
			.build();
	}

	/**
	 * 이 사람만 방에서 빠진다. 방과 메시지는 남고 상대는 계속 본다.
	 */
	@Transactional
	public void leaveChatRoom(Long chatRoomId, Long memberId) {
		ChatRoomMember chatRoomMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다"));

		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		Long otherMemberId = otherSideOf(chatRoom, memberId);
		Member leavingMember = memberRepository.findById(memberId)
			.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

		chatRoomMember.leave();
		permissionCache.invalidate(chatRoomId, memberId);

		runQuietly("나가기 알림 전송", () -> {
			ChatMessage saved = saveSystemMessage(chatRoomId,
				leavingMember.getNickname() + "님이 채팅방을 나갔습니다");
			publishSystemMessage(saved, otherMemberId);

			chatBroadcaster.toUser(otherMemberId, "/queue/chatroom-status",
				ChatRoomStatusEvent.builder()
					.chatRoomId(chatRoomId)
					.eventType(ChatRoomStatusEvent.EventType.MEMBER_LEFT)
					.memberId(memberId)
					.memberNickname(leavingMember.getNickname())
					.build());
		});
	}

	/**
	 * @return 실제로 다시 들어왔으면 true. 이미 들어와 있었으면 false
	 */
	@Transactional
	public boolean rejoinChatRoom(Long chatRoomId, Long memberId) {
		ChatRoomMember chatRoomMember = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId).orElse(null);
		if (chatRoomMember == null || !chatRoomMember.isLeft()) {
			return false;
		}

		chatRoomMember.rejoin();
		chatRoomMemberRepository.save(chatRoomMember);
		permissionCache.invalidate(chatRoomId, memberId);
		return true;
	}

	/**
	 * 오래 안 쓴 방을 닫는다.
	 *
	 * <p>부르는 곳이 없다. 주기적으로 돌리려면 스케줄에 걸어야 한다.
	 */
	@Transactional
	public void autoCloseInactiveChatRooms() {
		Instant threshold = Instant.now().minusSeconds(AUTO_CLOSE_AFTER_SECONDS);

		for (ChatRoom chatRoom : chatRoomRepository
			.findInactiveChatRooms(ChatRoomStatus.ACTIVE, threshold)) {

			chatRoom.autoClose();
			Long chatRoomId = chatRoom.getChatRoomId();
			Long buyerId = chatRoom.getBuyer().getMemberId();
			Long sellerId = chatRoom.getSeller().getMemberId();

			runQuietly("자동 종료 알림 전송", () -> {
				ChatMessage saved = saveSystemMessage(chatRoomId,
					"채팅방이 30일 미사용으로 자동 종료되었습니다");

				// 양쪽에 각각 보낸다. 받는 사람이 실려 있어야 받는 서버가 다시 조회하지 않는다.
				publishSystemMessage(saved, buyerId);
				publishSystemMessage(saved, sellerId);

				ChatRoomStatusEvent event = ChatRoomStatusEvent.builder()
					.chatRoomId(chatRoomId)
					.eventType(ChatRoomStatusEvent.EventType.ROOM_CLOSED)
					// 사람이 아니라 시스템이 닫았다
					.memberId(0L)
					.status(ChatRoomStatus.AUTO_CLOSED)
					.build();

				chatBroadcaster.toUser(buyerId, "/queue/chatroom-status", event);
				chatBroadcaster.toUser(sellerId, "/queue/chatroom-status", event);
			});
		}
	}

	public long getTotalUnreadCount(Long memberId) {
		List<Long> chatRoomIds = chatRoomMemberRepository.findByMemberId(memberId).stream()
			.map(ChatRoomMember::getChatRoomId)
			.toList();

		return unreadCountService.getBatch(chatRoomIds, memberId).values().stream()
			.mapToLong(Long::longValue)
			.sum();
	}

	public ChatRoomMemberResponse getChatRoomMemberInfo(Long chatRoomId, Long memberId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		requireParticipant(chatRoom, memberId);

		Member otherMember = otherMemberOf(chatRoom, memberId);
		ChatRoomMember mySettings = chatRoomMemberRepository
			.findByChatRoomIdAndMemberId(chatRoomId, memberId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다"));

		boolean isOnline = chatPresenceService.isOnline(otherMember.getMemberId());

		return ChatRoomMemberResponse.builder()
			.memberId(otherMember.getMemberId())
			.nickname(otherMember.getNickname())
			.profileUrl(getProfileImageUrl(otherMember))
			.isOnline(isOnline)
			.lastSeenAt(isOnline ? null : chatPresenceService.getLastSeenAt(otherMember.getMemberId()))
			.isPinned(mySettings.isPinned())
			.isMuted(mySettings.isMuted())
			.lastReadAt(mySettings.getLastReadAt())
			.chatRoomId(chatRoom.getChatRoomId())
			.productId(productIdOf(chatRoom))
			.productTitle(productTitleOf(chatRoom))
			.build();
	}

	/**
	 * 세 곳에서 같은 모양으로 만들던 응답의 공통 부분.
	 *
	 * <p>썸네일과 안읽음 개수는 부르는 쪽마다 얻는 방법이 달라 여기서 채우지 않는다.
	 * 목록은 한 번에 모아 오고 상세는 하나씩 본다.
	 */
	private ChatRoomResponse.ChatRoomResponseBuilder baseResponse(ChatRoom chatRoom,
																  Member otherMember,
																  ChatRoomMember settings) {
		return ChatRoomResponse.builder()
			.chatRoomId(chatRoom.getChatRoomId())
			.productId(productIdOf(chatRoom))
			.productTitle(productTitleOf(chatRoom))
			.otherMemberId(otherMember.getMemberId())
			.otherMemberNickname(otherMember.getNickname())
			.otherMemberProfileUrl(getProfileImageUrl(otherMember))
			.lastMessage(chatRoom.getLastMessage())
			.lastMessageAt(chatRoom.getLastMessageAt())
			.status(chatRoom.getStatus())
			.isPinned(settings != null && settings.isPinned())
			.isMuted(settings != null && settings.isMuted())
			.isLeft(settings != null && settings.isLeft());
	}

	private ChatRoomResponse.MemberInfo presenceOf(Member member) {
		boolean isOnline = chatPresenceService.isOnline(member.getMemberId());
		return ChatRoomResponse.MemberInfo.builder()
			.isOnline(isOnline)
			.lastSeenAt(isOnline ? null : chatPresenceService.getLastSeenAt(member.getMemberId()))
			.build();
	}

	private Map<Long, String> thumbnailsOf(List<ChatRoom> chatRooms) {
		List<Long> productIds = chatRooms.stream()
			.map(ChatRoom::getProduct)
			.filter(java.util.Objects::nonNull)
			.map(Product::getProductId)
			.toList();

		if (productIds.isEmpty()) {
			return Map.of();
		}

		return productFileRepository.findByProduct_ProductIdIn(productIds).stream()
			.filter(productFile -> productFile.isThumbnail())
			.collect(Collectors.toMap(
				productFile -> productFile.getProduct().getProductId(),
				productFile -> fileUrlResolver.toPublicUrl(productFile.getFile()),
				(a, b) -> a));
	}

	private String getProductThumbnailUrl(Product product) {
		if (product == null || product.getProductId() == null) {
			return null;
		}
		return productFileRepository.findByProduct_ProductId(product.getProductId()).stream()
			.filter(productFile -> productFile.isThumbnail())
			.findFirst()
			.map(productFile -> fileUrlResolver.toPublicUrl(productFile.getFile()))
			.orElse(null);
	}

	/**
	 * 직접 올린 것, 카카오에서 받은 것, 기본 이미지 순으로 고른다.
	 */
	private String getProfileImageUrl(Member member) {
		if (member.getProfileImage() != null) {
			String publicUrl = fileUrlResolver.toPublicUrl(member.getProfileImage());
			if (publicUrl != null) {
				return publicUrl;
			}
		}
		String kakaoUrl = member.getKakaoProfileImageUrl();
		if (kakaoUrl != null && !kakaoUrl.isEmpty()) {
			return kakaoUrl;
		}
		return DEFAULT_PROFILE_IMAGE;
	}

	private void sendRejoinNotification(Long chatRoomId, Long memberId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		Member rejoining = memberId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getBuyer() : chatRoom.getSeller();
		Long receiverId = otherSideOf(chatRoom, memberId);

		ChatMessage saved = saveSystemMessage(chatRoomId,
			rejoining.getNickname() + "님이 다시 들어왔습니다");
		publishSystemMessage(saved, receiverId);

		chatBroadcaster.toUser(receiverId, "/queue/chatroom-status",
			ChatRoomStatusEvent.builder()
				.chatRoomId(chatRoomId)
				.eventType(ChatRoomStatusEvent.EventType.MEMBER_REJOINED)
				.memberId(memberId)
				.memberNickname(rejoining.getNickname())
				.build());
	}

	private ChatMessage saveSystemMessage(Long chatRoomId, String content) {
		ChatMessage systemMessage = ChatMessage.createSystemMessage(chatRoomId, content);
		systemMessage.setCreatedAt(Instant.now());
		return chatMessageRepository.save(systemMessage);
	}

	private void publishSystemMessage(ChatMessage message, Long receiverId) {
		redisPubSubPublisher.publish(ChatMessageResponse.from(message, null)
			.toBuilder().receiverId(receiverId).build());
	}

	private void requireParticipant(ChatRoom chatRoom, Long memberId) {
		if (!memberId.equals(chatRoom.getBuyer().getMemberId())
			&& !memberId.equals(chatRoom.getSeller().getMemberId())) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "채팅방 접근 권한이 없습니다");
		}
	}

	private Member otherMemberOf(ChatRoom chatRoom, Long memberId) {
		return memberId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getSeller() : chatRoom.getBuyer();
	}

	private Long otherSideOf(ChatRoom chatRoom, Long memberId) {
		return otherMemberOf(chatRoom, memberId).getMemberId();
	}

	private Long productIdOf(ChatRoom chatRoom) {
		return chatRoom.getProduct() == null ? 0L : chatRoom.getProduct().getProductId();
	}

	private String productTitleOf(ChatRoom chatRoom) {
		return chatRoom.getProduct() == null ? DELETED_PRODUCT : chatRoom.getProduct().getTitle();
	}

	/**
	 * 늦어도 되는 곁작업. 실패해도 부르는 쪽을 되돌리지 않는다.
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
