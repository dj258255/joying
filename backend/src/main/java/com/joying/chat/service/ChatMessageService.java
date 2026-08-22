package com.joying.chat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.Objects;
import java.util.Map;
import java.util.HashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * 메시지를 읽고 고치고 지운다.
 *
 * <p>보내는 것은 {@link ChatService}가 맡는다. 여기는 이미 저장된 것을 다룬다.
 */
@Service
@RequiredArgsConstructor
public class ChatMessageService {

	private static final Logger log = LoggerFactory.getLogger(ChatMessageService.class);

	private static final String SEQUENCE = "sequence";

	private final ChatMessageRepository chatMessageRepository;
	private final ChatRoomRepository chatRoomRepository;
	private final RedisPubSubPublisher redisPubSubPublisher;
	private final ChatRoomPermissionCache permissionCache;

	/**
	 * 이 방을 볼 수 있는 사람인지.
	 *
	 * <p>보내는 경로와 같은 판정을 쓴다. 예전에는 여기서 구매자와 판매자인지만 보고
	 * 나갔는지를 보지 않아, 나간 사람이 히스토리를 계속 읽을 수 있었다.
	 */
	private void validateChatRoomAccess(Long chatRoomId, Long memberId) {
		if (!permissionCache.hasPermission(chatRoomId, memberId)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "채팅방 접근 권한이 없습니다");
		}
	}

	public List<ChatMessageResponse> getMessages(Long chatRoomId, int page, int size) {
		return toResponses(chatMessageRepository
			.findByChatRoomIdAndIsDeletedFalseOrderBySequenceDesc(chatRoomId, desc(page, size)));
	}

	/**
	 * 커서로 메시지를 가져온다.
	 *
	 * <p>{@code before}는 과거로 거슬러 올라가는 것이고 {@code after}는 끊긴 사이에
	 * 놓친 것을 받는 것이다. 방향이 반대라 함께 쓸 수 없다. 정렬도 그래서 다르다.
	 * 놓친 것은 받는 쪽이 순서대로 이어붙여야 하므로 오래된 순으로 준다.
	 *
	 * <p>커서는 방 안의 메시지 번호다. 시각을 커서로 쓰면 같은 밀리초에 저장된 것이
	 * 경계에서 빠지거나 두 번 온다.
	 */
	public List<ChatMessageResponse> getMessagesBefore(Long chatRoomId, Long before,
													   Long after, int size, Long memberId) {
		validateChatRoomAccess(chatRoomId, memberId);

		if (before != null && after != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE,
				"before와 after 파라미터는 동시에 사용할 수 없습니다");
		}

		List<ChatMessage> messages;
		if (after != null) {
			messages = chatMessageRepository
				.findByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanOrderBySequenceAsc(
					chatRoomId, after, asc(0, size));
		} else if (before != null) {
			messages = chatMessageRepository
				.findByChatRoomIdAndIsDeletedFalseAndSequenceLessThanOrderBySequenceDesc(
					chatRoomId, before, desc(0, size));
		} else {
			messages = chatMessageRepository
				.findByChatRoomIdAndIsDeletedFalseOrderBySequenceDesc(chatRoomId, desc(0, size));
		}

		return toResponses(messages);
	}

	public List<ChatMessageResponse> searchMessages(Long chatRoomId, String keyword,
													int page, int size, Long memberId) {
		validateChatRoomAccess(chatRoomId, memberId);

		return toResponses(chatMessageRepository
			.findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderBySequenceDesc(
				chatRoomId, keyword, desc(page, size)));
	}

	/**
	 * 안읽음 건수.
	 *
	 * <p>읽은 시각을 받아 그 이후를 센다. 정확히 세는 것은 {@code UnreadCountService}
	 * 가 읽은 번호로 하고, 여기는 시각만 아는 자리에서 쓴다.
	 */
	public long getUnreadCount(Long chatRoomId, Instant lastReadAt) {
		if (lastReadAt == null) {
			return 0L;
		}
		return chatMessageRepository
			.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfter(chatRoomId, lastReadAt);
	}

	/**
	 * 끊긴 사이에 놓친 것을 받는다.
	 */
	public List<ChatMessageResponse> getMessagesAfter(Long chatRoomId, Long after,
													  int limit, Long memberId) {
		validateChatRoomAccess(chatRoomId, memberId);

		return toResponses(chatMessageRepository
			.findByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanOrderBySequenceAsc(
				chatRoomId, after, asc(0, limit)));
	}

	/**
	 * 특정 메시지를 가운데 두고 앞뒤를 함께 준다.
	 *
	 * <p>답장을 눌러 원본으로 뛰거나 검색 결과에서 문맥을 볼 때 쓴다. 앞엣것은 최신순으로
	 * 받아 뒤집어야 시간순이 된다.
	 */
	public List<ChatMessageResponse> getMessagesAround(Long chatRoomId, String messageId,
													   int before, int after, Long memberId) {
		validateChatRoomAccess(chatRoomId, memberId);

		ChatMessage target = chatMessageRepository.findById(messageId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "메시지를 찾을 수 없습니다"));

		if (!chatRoomId.equals(target.getChatRoomId())) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "해당 채팅방의 메시지가 아닙니다");
		}

		Long targetSequence = target.getSequence();
		if (targetSequence == null) {
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "메시지 번호가 없습니다");
		}

		List<ChatMessage> all = new ArrayList<>();

		if (before > 0) {
			List<ChatMessage> beforeMessages = new ArrayList<>(chatMessageRepository
				.findByChatRoomIdAndIsDeletedFalseAndSequenceLessThanOrderBySequenceDesc(
					chatRoomId, targetSequence, desc(0, before)));
			// 최신순으로 받았으므로 시간순으로 뒤집는다
			java.util.Collections.reverse(beforeMessages);
			all.addAll(beforeMessages);
		}

		all.add(target);

		if (after > 0) {
			all.addAll(chatMessageRepository
				.findByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanOrderBySequenceAsc(
					chatRoomId, targetSequence, asc(0, after)));
		}

		return toResponses(all);
	}

	/**
	 * 지운 것으로 표시한다.
	 *
	 * <p>실제로 지우지 않는 이유는 답장이 이 메시지를 가리키고 있을 수 있기 때문이다.
	 * 지우면 상대 화면의 답장이 무엇을 가리키는지 알 수 없게 된다.
	 */
	public void deleteMessage(Long chatRoomId, String messageId, Long memberId) {
		ChatMessage message = requireOwnMessage(chatRoomId, messageId, memberId);

		if (message.isDeleted()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "이미 삭제된 메시지입니다");
		}

		message.delete();
		ChatMessage saved = chatMessageRepository.save(message);

		log.info("메시지 삭제 완료: messageId={}, chatRoomId={}, memberId={}",
			messageId, chatRoomId, memberId);

		publishToBothSides(chatRoomId, memberId, saved);
	}

	public ChatMessageResponse updateMessage(Long chatRoomId, String messageId,
											 Long memberId, String newContent) {
		if (newContent == null || newContent.isBlank()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "메시지 내용은 비어 있을 수 없습니다");
		}

		ChatMessage message = requireOwnMessage(chatRoomId, messageId, memberId);

		if (message.getType() != MessageType.TEXT) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "텍스트 메시지만 수정할 수 있습니다");
		}
		if (message.isDeleted()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "삭제된 메시지는 수정할 수 없습니다");
		}
		if (newContent.equals(message.getContent())) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "수정할 내용이 기존 내용과 동일합니다");
		}

		boolean firstEdit = message.edit(newContent, Instant.now());
		ChatMessage saved = chatMessageRepository.save(message);

		log.info("메시지 수정 완료: messageId={}, chatRoomId={}, memberId={}, 첫 수정={}",
			messageId, chatRoomId, memberId, firstEdit);

		return publishToBothSides(chatRoomId, memberId, saved);
	}

	/**
	 * 이 사람이 보낸 메시지가 맞는지 확인하고 돌려준다.
	 *
	 * <p>고치기와 지우기가 같은 확인을 하고 있어 한곳으로 모았다.
	 */
	private ChatMessage requireOwnMessage(Long chatRoomId, String messageId, Long memberId) {
		ChatMessage message = chatMessageRepository.findById(messageId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "메시지를 찾을 수 없습니다"));

		if (!chatRoomId.equals(message.getChatRoomId())) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "해당 채팅방의 메시지가 아닙니다");
		}
		if (!memberId.equals(message.getSenderId())) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "본인의 메시지만 조작할 수 있습니다");
		}
		return message;
	}

	/**
	 * 바뀐 메시지를 양쪽 화면에 반영한다.
	 *
	 * <p>받는 사람을 미리 실어 보내면 받는 서버가 방을 다시 조회하지 않아도 된다.
	 */
	private ChatMessageResponse publishToBothSides(Long chatRoomId, Long memberId,
												   ChatMessage saved) {
		ChatMessage replyMessage = findReplyOf(saved);

		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
			.orElseThrow(() -> new BusinessException(
				ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다"));

		Long receiverId = memberId.equals(chatRoom.getBuyer().getMemberId())
			? chatRoom.getSeller().getMemberId()
			: chatRoom.getBuyer().getMemberId();

		ChatMessageResponse response = ChatMessageResponse.from(saved, replyMessage)
			.toBuilder()
			.receiverId(receiverId)
			.build();

		redisPubSubPublisher.publish(response);
		return response;
	}

	/**
	 * 답장 대상 메시지. 답장이 아니면 null.
	 *
	 * <p>한 건을 내보낼 때만 쓴다. 목록에는 쓰지 않는다.
	 */
	private ChatMessage findReplyOf(ChatMessage message) {
		if (message.getReplyToMessageId() == null) {
			return null;
		}
		return chatMessageRepository.findById(message.getReplyToMessageId()).orElse(null);
	}

	/**
	 * 목록에 실을 답장 대상을 한 번에 가져온다.
	 *
	 * <p>예전에는 메시지마다 따로 조회했다. 답장이 섞여 있으면 한 번 읽을 때 그만큼
	 * 조회가 더 나간다. 500건을 읽을 때 답장이 없으면 p95 10ms, 전부 답장이면 60ms 였다.
	 *
	 * <p>같은 메시지에 여러 건이 답장할 수 있어 식별자를 모아 중복을 없앤 뒤 부른다.
	 * 지워진 것을 가리키는 답장은 결과에 없으므로 {@code null} 이 되고, 화면은 그것을
	 * 지워진 메시지로 표시한다.
	 */
	private Map<String, ChatMessage> replyTargetsOf(List<ChatMessage> messages) {
		Set<String> ids = messages.stream()
			.map(ChatMessage::getReplyToMessageId)
			.filter(Objects::nonNull)
			.collect(Collectors.toSet());

		if (ids.isEmpty()) {
			return Map.of();
		}

		Map<String, ChatMessage> byId = new HashMap<>();
		chatMessageRepository.findAllById(ids).forEach(message -> byId.put(message.getId(), message));
		return byId;
	}

	private List<ChatMessageResponse> toResponses(List<ChatMessage> messages) {
		Map<String, ChatMessage> replyTargets = replyTargetsOf(messages);

		return messages.stream()
			.map(message -> {
				String replyToId = message.getReplyToMessageId();
				ChatMessage replyTarget = replyToId == null ? null : replyTargets.get(replyToId);
				return ChatMessageResponse.from(message, replyTarget);
			})
			.toList();
	}

	private Pageable desc(int page, int size) {
		return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, SEQUENCE));
	}

	private Pageable asc(int page, int size) {
		return PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, SEQUENCE));
	}
}
