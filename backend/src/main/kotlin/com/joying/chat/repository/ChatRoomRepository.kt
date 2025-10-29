package com.joying.chat.repository

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * 채팅방 Repository (MySQL - JPA)
 */
@Repository
interface ChatRoomRepository : JpaRepository<ChatRoom, Long> {

    /**
     * 대여 거래 ID로 채팅방 조회
     */
    fun findByRentalHisId(rentalHisId: Long): Optional<ChatRoom>

    /**
     * 대여 거래 ID로 채팅방 존재 여부 확인
     */
    fun existsByRentalHisId(rentalHisId: Long): Boolean

    /**
     * 채팅방 상태로 조회
     */
    fun findAllByStatus(status: ChatRoomStatus): List<ChatRoom>

    /**
     * 특정 회원이 참여한 채팅방 목록 조회 (페이징 없이)
     */
    @Query("""
        SELECT DISTINCT cr
        FROM ChatRoom cr
        JOIN FETCH cr.members m
        WHERE m.memberId = :memberId
        ORDER BY cr.updatedAt DESC
    """)
    fun findAllByMemberId(@Param("memberId") memberId: Long): List<ChatRoom>

    /**
     * 채팅방 ID와 회원 ID로 채팅방 조회 (접근 권한 확인용)
     */
    @Query("""
        SELECT cr
        FROM ChatRoom cr
        JOIN cr.members m
        WHERE cr.chatRoomId = :chatRoomId
        AND m.memberId = :memberId
    """)
    fun findByChatRoomIdAndMemberId(
        @Param("chatRoomId") chatRoomId: Long,
        @Param("memberId") memberId: Long
    ): Optional<ChatRoom>
}