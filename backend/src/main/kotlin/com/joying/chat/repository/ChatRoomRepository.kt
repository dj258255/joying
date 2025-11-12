package com.joying.chat.repository

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomStatus
import com.joying.member.domain.Member
import com.joying.product.domain.Product
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
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
     *
     * Fetch Join으로 Lazy Loading 방지
     * - Product, Buyer, Seller를 한 번에 조회하여 N+1 문제 해결
     * - Coroutine에서 Hibernate Session 종료 후 Lazy Loading 시도 시 발생하는 LazyInitializationException 방지
     * - isLeft=false인 채팅방만 조회 (나가지 않은 채팅방만)
     */
    @Query("""
        SELECT DISTINCT cr FROM ChatRoom cr
        LEFT JOIN FETCH cr.product p
        LEFT JOIN FETCH cr.buyer b
        LEFT JOIN FETCH cr.seller s
        LEFT JOIN ChatRoomMember crm ON crm.chatRoom = cr AND crm.member.memberId = :memberId
        WHERE (cr.buyer.memberId = :memberId OR cr.seller.memberId = :memberId)
        AND crm.isLeft = false
        ORDER BY cr.lastMessageAt DESC NULLS LAST
    """)
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
        @Param("threshold") threshold: Instant
    ): List<ChatRoom>

    /**
     * 채팅방 ID로 조회 (Fetch Join 적용)
     * Product, Buyer, Seller를 한 번에 조회
     */
    @Query("""
        SELECT cr FROM ChatRoom cr
        LEFT JOIN FETCH cr.product p
        LEFT JOIN FETCH cr.buyer b
        LEFT JOIN FETCH cr.seller s
        WHERE cr.chatRoomId = :chatRoomId
    """)
    fun findByIdWithFetchJoin(@Param("chatRoomId") chatRoomId: Long): Optional<ChatRoom>

    /**
     * 채팅방 ID로 조회 (프로필 이미지까지 Fetch Join 적용)
     * Product, Buyer, Seller, ProfileImage(File)를 한 번에 조회
     *
     * 푸시 알림 전송 시 LazyInitializationException 방지용
     * - withContext(Dispatchers.IO)에서 별도 스레드로 전환되면 Hibernate Session이 끊김
     * - Member.profileImage (File 엔티티)까지 미리 로드하여 세션 없이도 접근 가능
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
    fun findByIdWithProfileImages(@Param("chatRoomId") chatRoomId: Long): Optional<ChatRoom>
}