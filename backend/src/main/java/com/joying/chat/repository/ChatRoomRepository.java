package com.joying.chat.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomStatus;
import com.joying.member.domain.Member;
import com.joying.product.domain.Product;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

	/** 같은 짝이 방을 두 번 만들지 않게 확인한다 */
	Optional<ChatRoom> findByProductAndBuyerAndSeller(Product product, Member buyer, Member seller);

	/**
	 * 이 사람이 참여한 방을 한 번에 가져온다.
	 *
	 * <p>Fetch Join으로 상품과 양쪽 회원, 프로필 이미지까지 함께 읽는다. 나눠서 읽으면
	 * 방 개수만큼 쿼리가 더 나가고, 트랜잭션 밖에서 만지면 세션이 끊겨 있다.
	 *
	 * <p>나간 방은 빼고 준다.
	 */
	@Query("""
		SELECT DISTINCT cr FROM ChatRoom cr
		LEFT JOIN FETCH cr.product p
		LEFT JOIN FETCH cr.buyer b
		LEFT JOIN FETCH b.profileImage
		LEFT JOIN FETCH cr.seller s
		LEFT JOIN FETCH s.profileImage
		LEFT JOIN ChatRoomMember crm ON crm.chatRoom = cr AND crm.member.memberId = :memberId
		WHERE (cr.buyer.memberId = :memberId OR cr.seller.memberId = :memberId)
		AND crm.isLeft = false
		ORDER BY cr.lastMessageAt DESC NULLS LAST
		""")
	List<ChatRoom> findByMemberId(@Param("memberId") Long memberId);

	@Query("SELECT cr FROM ChatRoom cr "
		+ "WHERE (cr.buyer.memberId = :memberId OR cr.seller.memberId = :memberId) "
		+ "AND cr.status = :status")
	List<ChatRoom> findByMemberIdAndStatus(
		@Param("memberId") Long memberId, @Param("status") ChatRoomStatus status);

	/** 오래 안 쓴 방을 찾아 자동으로 닫는 데 쓴다 */
	@Query("SELECT cr FROM ChatRoom cr WHERE cr.status = :status AND cr.lastMessageAt < :threshold")
	List<ChatRoom> findInactiveChatRooms(
		@Param("status") ChatRoomStatus status, @Param("threshold") Instant threshold);

	@Query("""
		SELECT DISTINCT cr FROM ChatRoom cr
		LEFT JOIN FETCH cr.product p
		LEFT JOIN FETCH cr.buyer b
		LEFT JOIN FETCH b.profileImage
		LEFT JOIN FETCH cr.seller s
		LEFT JOIN FETCH s.profileImage
		WHERE cr.chatRoomId = :chatRoomId
		""")
	Optional<ChatRoom> findByIdWithFetchJoin(@Param("chatRoomId") Long chatRoomId);

	/**
	 * 프로필 이미지까지 미리 읽는다.
	 *
	 * <p>푸시 알림은 트랜잭션 밖에서 만들어진다. 그때 지연 로딩을 건드리면 세션이
	 * 끊겨 있어 터진다. 미리 읽어 두면 세션 없이도 쓸 수 있다.
	 */
	@Query("""
		SELECT DISTINCT cr FROM ChatRoom cr
		LEFT JOIN FETCH cr.product p
		LEFT JOIN FETCH cr.buyer b
		LEFT JOIN FETCH b.profileImage
		LEFT JOIN FETCH cr.seller s
		LEFT JOIN FETCH s.profileImage
		WHERE cr.chatRoomId = :chatRoomId
		""")
	Optional<ChatRoom> findByIdWithProfileImages(@Param("chatRoomId") Long chatRoomId);
}
