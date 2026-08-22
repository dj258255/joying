package com.joying.chat.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.joying.chat.document.ChatMessage;

/**
 * 채팅 메시지 저장소.
 *
 * <p>블로킹이다. 서비스에서 그대로 부른다.
 */
@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

	/**
	 * 방의 메시지를 최신순으로.
	 *
	 * <p>정렬 기준은 저장 시각이 아니라 방 안에서 발급한 번호다. 같은 밀리초에 저장된
	 * 두 건은 시각으로 순서를 정할 수 없어 읽을 때마다 자리가 바뀐다.
	 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseOrderBySequenceDesc(
		Long chatRoomId, Pageable pageable);

	/** 커서 페이징. 이 번호보다 앞을 최신순으로 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndSequenceLessThanOrderBySequenceDesc(
		Long chatRoomId, Long before, Pageable pageable);

	/** 방의 가장 최근 메시지 하나 */
	ChatMessage findFirstByChatRoomIdAndIsDeletedFalseOrderBySequenceDesc(Long chatRoomId);

	/** 이 시각 이후 메시지 수 */
	long countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfter(Long chatRoomId, Instant after);

	/**
	 * 이 사람이 보내지 않은 메시지 수.
	 *
	 * <p>한 번도 읽은 적이 없을 때 쓴다. 그때는 기준 시각이 없으므로 방의 처음부터
	 * 전부 센다.
	 */
	long countByChatRoomIdAndIsDeletedFalseAndSenderIdNot(Long chatRoomId, Long excludeSenderId);

	/**
	 * 이 시각 이후, 이 사람이 보내지 않은 메시지 수.
	 *
	 * <p>안읽음을 셀 때 본인이 보낸 것은 빼야 한다.
	 */
	long countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(
		Long chatRoomId, Instant after, Long excludeSenderId);

	/** 방 안에서 내용으로 찾기 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderBySequenceDesc(
		Long chatRoomId, String keyword, Pageable pageable);

	/**
	 * 이 번호 이후를 오래된 순으로.
	 *
	 * <p>재접속했을 때 놓친 메시지를 받는 데 쓴다. 받는 쪽이 순서대로 이어붙일 수
	 * 있어야 하므로 오름차순이다.
	 *
	 * <p>커서를 시각으로 잡으면 같은 밀리초에 저장된 메시지 하나가 조용히 빠진다.
	 * {@code After}는 초과라서 커서와 시각이 같은 것은 걸리지 않는다.
	 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanOrderBySequenceAsc(
		Long chatRoomId, Long after, Pageable pageable);

	/**
	 * 이 번호 이후, 이 사람이 보내지 않은 메시지 수.
	 *
	 * <p>안읽음을 셀 때 쓴다. 시각으로 세면 같은 밀리초에 저장된 메시지가 경계에서
	 * 빠진다. 읽지 않았는데 읽은 것으로 센다.
	 */
	long countByChatRoomIdAndIsDeletedFalseAndSequenceGreaterThanAndSenderIdNot(
		Long chatRoomId, Long afterSequence, Long excludeSenderId);

	/** 같은 전송이 이미 저장돼 있는지 */
	java.util.Optional<ChatMessage> findByChatRoomIdAndClientMessageId(
		Long chatRoomId, String clientMessageId);

	/** 방에서 가장 큰 번호. 지운 것도 번호를 차지하므로 삭제 여부를 보지 않는다 */
	ChatMessage findFirstByChatRoomIdOrderBySequenceDesc(Long chatRoomId);

	/** 번호가 없는 메시지. 번호를 도입하기 전에 저장된 것들이다 */
	List<ChatMessage> findBySequenceIsNullOrderByCreatedAtAsc(Pageable pageable);

	/** 번호가 없는 메시지가 몇 건인지 */
	long countBySequenceIsNull();

	/** 방을 지울 때 메시지도 함께 지운다 */
	long deleteByChatRoomId(Long chatRoomId);
}
