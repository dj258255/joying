package com.joying.chat.domain

import jakarta.persistence.*
import org.hibernate.annotations.Comment

/**
 * 채팅방 참여자 엔티티 (MySQL)
 *
 * 채팅방과 회원의 다대다 관계를 풀어낸 중간 테이블
 * - 한 채팅방에 여러 참여자 (일반적으로 2명: OWNER, RENTER)
 * - 각 참여자의 역할(role)과 읽음 정보 관리
 */
@Entity
@Table(
    name = "chat_room_member",
    indexes = [
        Index(name = "idx_chat_room_member_chat_room_id", columnList = "chat_room_id"),
        Index(name = "idx_chat_room_member_member_id", columnList = "member_id")
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_chat_room_member",
            columnNames = ["chat_room_id", "member_id"]
        )
    ]
)
class ChatRoomMember(

    @Id
    @Column(name = "chat_room_member_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var chatRoomMemberId: Long? = null,

    @Comment("채팅방")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    var chatRoom: ChatRoom? = null,

    @Comment("회원 ID (Member FK - 논리적 참조)")
    @Column(name = "member_id", nullable = false)
    var memberId: Long,

    @Comment("역할 (OWNER: 대여자, RENTER: 대여받는 사람)")
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: ChatRoomMemberRole,

    @Comment("마지막으로 읽은 메시지 ID (MongoDB ObjectId)")
    @Column(name = "last_read_message_id")
    var lastReadMessageId: String? = null,

    @Comment("읽지 않은 메시지 수")
    @Column(name = "unread_count", nullable = false)
    var unreadCount: Int = 0

) : BaseEntity() {

    /**
     * 메시지 읽음 처리
     * @param messageId 읽은 메시지의 MongoDB ObjectId
     */
    fun markAsRead(messageId: String) {
        this.lastReadMessageId = messageId
        this.unreadCount = 0
    }

    /**
     * 읽지 않은 메시지 수 증가
     */
    fun incrementUnreadCount() {
        this.unreadCount++
    }

    /**
     * 읽지 않은 메시지 수 초기화
     */
    fun resetUnreadCount() {
        this.unreadCount = 0
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChatRoomMember) return false
        return chatRoomMemberId != null && chatRoomMemberId == other.chatRoomMemberId
    }

    override fun hashCode(): Int {
        return chatRoomMemberId?.hashCode() ?: 0
    }
}