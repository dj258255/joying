package com.joying.chat.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.joying.chat.document.ChatMessage;

/**
 * 채팅 메시지 저장소.
 *
 * <p>블로킹이다. 서비스에서 그대로 부른다.
 *
 * <p>문서 저장소에서 옮겨 왔다. 메서드 이름으로 만드는 질의는 그대로 두었고, 식별자가
 * 문자열인 것도 그대로다. 이미 나가 있는 값이라 숫자로 바꾸면 답장이 가리키는 대상과
 * 화면이 들고 있는 값이 전부 어긋난다.
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

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

	/**
	 * 방에 쌓인 건수.
	 *
	 * <p>제약이 실제로 걸려 있는지 확인할 때 쓴다. 응답만 보면 막혔는지 알 수 없고
	 * 남은 행을 세야 안다.
	 */
	long countByChatRoomId(Long chatRoomId);

	/**
	 * 방에서 가장 큰 번호. 지운 것도 번호를 차지하므로 삭제 여부를 보지 않는다.
	 *
	 * <p>번호가 없는 것을 조건에서 뺀다. PostgreSQL 은 내림차순에서 빈 값을 <b>먼저</b>
	 * 놓기 때문이다. 빼지 않으면 번호를 채우기 전 메시지가 맨 앞에 와서 가장 큰 번호를
	 * 0으로 읽고, 이미 쓴 번호를 다시 내주게 된다.
	 *
	 * <p>문서 저장소를 쓰던 때는 빈 값이 가장 작은 것으로 취급돼 내림차순에서 맨 뒤로
	 * 밀렸다. 같은 질의가 저장소에 따라 다른 답을 준다.
	 */
	@Query("SELECT m FROM ChatMessage m WHERE m.chatRoomId = :chatRoomId "
		+ "AND m.sequence IS NOT NULL ORDER BY m.sequence DESC LIMIT 1")
	ChatMessage findTopSequence(@Param("chatRoomId") Long chatRoomId);

	/** 번호가 없는 메시지. 번호를 도입하기 전에 저장된 것들이다 */
	List<ChatMessage> findBySequenceIsNullOrderByCreatedAtAsc(Pageable pageable);

	/** 번호가 없는 메시지가 몇 건인지 */
	long countBySequenceIsNull();

	/**
	 * 상대가 보낸 것 중 아직 안 읽은 것에 읽음 표시를 단다.
	 *
	 * <p>건수가 많을 수 있어 한 번에 갱신한다. 하나씩 읽어 고치면 방을 열 때마다
	 * 그만큼 왕복이 생긴다.
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("UPDATE ChatMessage m SET m.isRead = true "
		+ "WHERE m.chatRoomId = :chatRoomId AND m.senderId = :senderId "
		+ "AND m.isRead = false AND m.isDeleted = false")
	int markReadFrom(@Param("chatRoomId") Long chatRoomId, @Param("senderId") Long senderId);

	/** 방을 지울 때 메시지도 함께 지운다 */
	@Modifying(clearAutomatically = true)
	long deleteByChatRoomId(Long chatRoomId);
}
