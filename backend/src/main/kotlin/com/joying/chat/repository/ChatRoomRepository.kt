package com.joying.chat.repository

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomStatus
import com.joying.member.domain.Member
import com.joying.product.domain.Product
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.*

/**
 * 채팅방 Repository (MySQL)
 */
@Repository
interface ChatRoomRepository : JpaRepository<ChatRoom, Long> {

    /**
     * 상품, 구매자, 판매자로 채팅방 조회
     * (중복 채팅방 방지용)
     */
    fun findByProductAndBuyerAndSeller(
        product: Product,
        buyer: Member,
        seller: Member
    ): Optional<ChatRoom>

    /**
     * 회원이 참여한 모든 채팅방 조회 (구매자 또는 판매자)
     */
    @Query("SELECT cr FROM ChatRoom cr WHERE cr.buyer.memberId = :memberId OR cr.seller.memberId = :memberId")
    fun findByMemberId(@Param("memberId") memberId: Long): List<ChatRoom>

    /**
     * 회원이 참여한 활성 채팅방 조회
     */
    @Query("SELECT cr FROM ChatRoom cr WHERE (cr.buyer.memberId = :memberId OR cr.seller.memberId = :memberId) AND cr.status = :status")
    fun findByMemberIdAndStatus(
        @Param("memberId") memberId: Long,
        @Param("status") status: ChatRoomStatus
    ): List<ChatRoom>

    /**
     * 마지막 메시지 시간 기준으로 자동 종료 대상 채팅방 조회
     * (30일 이상 미사용)
     */
    @Query("SELECT cr FROM ChatRoom cr WHERE cr.status = :status AND cr.lastMessageAt < :threshold")
    fun findInactiveChatRooms(
        @Param("status") status: ChatRoomStatus,
        @Param("threshold") threshold: LocalDateTime
    ): List<ChatRoom>
}