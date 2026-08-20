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

	/** 방의 메시지를 최신순으로 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(
		Long chatRoomId, Pageable pageable);

	/** 커서 페이징. 이 시각 이전을 최신순으로 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc(
		Long chatRoomId, Instant before, Pageable pageable);

	/** 방의 가장 최근 메시지 하나 */
	ChatMessage findFirstByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(Long chatRoomId);

	/** 이 시각 이후 메시지 수 */
	long countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfter(Long chatRoomId, Instant after);

	/**
	 * 이 시각 이후, 이 사람이 보내지 않은 메시지 수.
	 *
	 * <p>안읽음을 셀 때 본인이 보낸 것은 빼야 한다.
	 */
	long countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(
		Long chatRoomId, Instant after, Long excludeSenderId);

	/** 방 안에서 내용으로 찾기 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndContentContainingOrderByCreatedAtDesc(
		Long chatRoomId, String keyword, Pageable pageable);

	/**
	 * 이 시각 이후를 오래된 순으로.
	 *
	 * <p>재접속했을 때 놓친 메시지를 받는 데 쓴다. 받는 쪽이 순서대로 이어붙일 수
	 * 있어야 하므로 오름차순이다.
	 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc(
		Long chatRoomId, Instant after, Pageable pageable);

	/** 특정 메시지 앞뒤로 뛸 때 쓴다 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
		Long chatRoomId, Instant before, Pageable pageable);

	/** 특정 메시지 앞뒤로 뛸 때 쓴다 */
	List<ChatMessage> findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtDesc(
		Long chatRoomId, Instant after, Pageable pageable);

	/** 방을 지울 때 메시지도 함께 지운다 */
	long deleteByChatRoomId(Long chatRoomId);
}
