package com.joying.chat.repository

import com.joying.chat.domain.ChatRoomMember
import com.joying.chat.domain.ChatRoomMemberRole
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * 채팅방 참여자 Repository (MySQL - JPA)
 */
@Repository
interface ChatRoomMemberRepository : JpaRepository<ChatRoomMember, Long> {

    /**
     * 채팅방 ID로 참여자 목록 조회
     */
    fun findAllByChatRoom_ChatRoomId(chatRoomId: Long): List<ChatRoomMember>

    /**
     * 채팅방 ID와 회원 ID로 참여자 조회
     */
    fun findByChatRoom_ChatRoomIdAndMemberId(
        chatRoomId: Long,
        memberId: Long
    ): Optional<ChatRoomMember>

    /**
     * 회원 ID로 참여 중인 모든 채팅방 참여자 정보 조회
     */
    fun findAllByMemberId(memberId: Long): List<ChatRoomMember>

    /**
     * 채팅방 ID와 역할로 참여자 조회
     */
    fun findByChatRoom_ChatRoomIdAndRole(
        chatRoomId: Long,
        role: ChatRoomMemberRole
    ): Optional<ChatRoomMember>

    /**
     * 채팅방 ID와 회원 ID로 참여자 존재 여부 확인
     */
    fun existsByChatRoom_ChatRoomIdAndMemberId(
        chatRoomId: Long,
        memberId: Long
    ): Boolean

    /**
     * 특정 회원의 읽지 않은 총 메시지 수 조회
     */
    @Query("""
        SELECT COALESCE(SUM(m.unreadCount), 0)
        FROM ChatRoomMember m
        WHERE m.memberId = :memberId
    """)
    fun getTotalUnreadCountByMemberId(@Param("memberId") memberId: Long): Long
}