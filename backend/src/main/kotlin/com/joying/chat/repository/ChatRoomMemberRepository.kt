package com.joying.chat.repository

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomMember
import com.joying.member.domain.Member
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * 채팅방 멤버 Repository (MySQL)
 */
@Repository
interface ChatRoomMemberRepository : JpaRepository<ChatRoomMember, Long> {

    /**
     * 채팅방과 회원으로 ChatRoomMember 조회
     */
    fun findByChatRoomAndMember(chatRoom: ChatRoom, member: Member): Optional<ChatRoomMember>

    /**
     * 채팅방 ID와 회원 ID로 ChatRoomMember 조회
     */
    @Query("SELECT crm FROM ChatRoomMember crm WHERE crm.chatRoom.chatRoomId = :chatRoomId AND crm.member.memberId = :memberId")
    fun findByChatRoomIdAndMemberId(
        @Param("chatRoomId") chatRoomId: Long,
        @Param("memberId") memberId: Long
    ): Optional<ChatRoomMember>

    /**
     * 회원 ID로 모든 ChatRoomMember 조회
     */
    @Query("SELECT crm FROM ChatRoomMember crm WHERE crm.member.memberId = :memberId")
    fun findByMemberId(@Param("memberId") memberId: Long): List<ChatRoomMember>

    /**
     * 회원 ID로 고정된 채팅방만 조회
     */
    @Query("SELECT crm FROM ChatRoomMember crm WHERE crm.member.memberId = :memberId AND crm.isPinned = true")
    fun findPinnedByMemberId(@Param("memberId") memberId: Long): List<ChatRoomMember>
}