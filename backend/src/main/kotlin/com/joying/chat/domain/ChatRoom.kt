package com.joying.chat.domain

import com.joying.common.entity.BaseEntity
import com.joying.member.domain.Member
import com.joying.product.domain.Product
import jakarta.persistence.*
import org.hibernate.annotations.Comment
import java.time.Instant

/**
 * 채팅방 엔티티 (MySQL)
 *
 * 상품별 구매자-판매자 간 1:1 채팅방
 * - product_id, buyer_id, seller_id 조합으로 유니크
 * - 하나의 상품에 대해 구매자와 판매자는 하나의 채팅방만 가짐
 */
@Entity
@Table(
    name = "chat_room",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_chat_room_product_buyer_seller",
            columnNames = ["product_id", "buyer_id", "seller_id"]
        )
    ],
    indexes = [
        Index(name = "idx_chat_room_buyer", columnList = "buyer_id"),
        Index(name = "idx_chat_room_seller", columnList = "seller_id"),
        Index(name = "idx_chat_room_product", columnList = "product_id"),
        Index(name = "idx_chat_room_last_message_at", columnList = "last_message_at"),
        Index(name = "idx_chat_room_status", columnList = "status")
    ]
)
class ChatRoom(

    @Id
    @Column(name = "chat_room_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var chatRoomId: Long? = null,

    @Comment("대여 상품")
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "product_id", nullable = true)
    var product: Product? = null,

    @Comment("구매자 (대여자)")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    var buyer: Member,

    @Comment("판매자 (임대자)")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    var seller: Member,

    @Comment("마지막 메시지 내용")
    @Column(name = "last_message", length = 500)
    var lastMessage: String? = null,

    @Comment("마지막 메시지 시간 (UTC)")
    @Column(name = "last_message_at")
    var lastMessageAt: Instant? = null,

    @Comment("채팅방 상태 (ACTIVE, CLOSED, AUTO_CLOSED)")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: ChatRoomStatus = ChatRoomStatus.ACTIVE,

    @Comment("종료 시간 (UTC)")
    @Column(name = "closed_at")
    var closedAt: Instant? = null

) : BaseEntity() {

    /**
     * 마지막 메시지 업데이트
     */
    fun updateLastMessage(message: String, messageAt: Instant) {
        this.lastMessage = message
        this.lastMessageAt = messageAt
    }

    /**
     * 채팅방 종료 (상호 동의 또는 나가기)
     */
    fun close() {
        this.status = ChatRoomStatus.CLOSED
        this.closedAt = Instant.now()
    }

    /**
     * 채팅방 자동 종료 (30일 미사용, 거래 완료 후 7일 등)
     */
    fun autoClose() {
        this.status = ChatRoomStatus.AUTO_CLOSED
        this.closedAt = Instant.now()
    }

    /**
     * 채팅방 재개 (활성화)
     */
    fun reopen() {
        this.status = ChatRoomStatus.ACTIVE
        this.closedAt = null
    }

    /**
     * 채팅방 활성 여부 확인
     */
    fun isActive(): Boolean {
        return this.status == ChatRoomStatus.ACTIVE
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChatRoom) return false
        return chatRoomId != null && chatRoomId == other.chatRoomId
    }

    override fun hashCode(): Int {
        return chatRoomId?.hashCode() ?: 0
    }

    fun detachProductReference() {
        this.product = null
    }
}