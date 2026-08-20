package com.joying.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.member.domain.Member;

@Repository
public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

	Optional<ChatRoomMember> findByChatRoomAndMember(ChatRoom chatRoom, Member member);

	@Query("SELECT crm FROM ChatRoomMember crm "
		+ "WHERE crm.chatRoom.chatRoomId = :chatRoomId AND crm.member.memberId = :memberId")
	Optional<ChatRoomMember> findByChatRoomIdAndMemberId(
		@Param("chatRoomId") Long chatRoomId, @Param("memberId") Long memberId);

	@Query("SELECT crm FROM ChatRoomMember crm WHERE crm.member.memberId = :memberId")
	List<ChatRoomMember> findByMemberId(@Param("memberId") Long memberId);

	@Query("SELECT crm FROM ChatRoomMember crm "
		+ "WHERE crm.member.memberId = :memberId AND crm.isPinned = true")
	List<ChatRoomMember> findPinnedByMemberId(@Param("memberId") Long memberId);
}
