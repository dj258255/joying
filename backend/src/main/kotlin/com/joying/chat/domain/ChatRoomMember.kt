package com.joying.chat.domain

import com.joying.common.entity.BaseEntity
import com.joying.member.domain.Member
import jakarta.persistence.*
import org.hibernate.annotations.Comment
import java.time.Instant

/**
 * 채팅방 참여자 설정 엔티티 (MySQL)
 *
 * 채팅방 참여자별 개인 설정 관리
 * - 읽음 시간 (안읽은 메시지 개수 계산용)
 * - 고정 여부
 * - 알림 설정
 */
@Entity
@Table(
    name = "chat_room_member",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_chat_room_member_room_member",
            columnNames = ["chat_room_id", "member_id"]
        )
    ],
    indexes = [
        Index(name = "idx_chat_room_member_member", columnList = "member_id"),
        Index(name = "idx_chat_room_member_room", columnList = "chat_room_id")
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
    var chatRoom: ChatRoom,

    @Comment("채팅방 ID (FK 직접 접근용)")
    @Column(name = "chat_room_id", insertable = false, updatable = false)
    var chatRoomId: Long? = null,

    @Comment("회원")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    var member: Member,

    @Comment("마지막으로 읽은 시간 (UTC, 안읽은 메시지 개수 계산용)")
    @Column(name = "last_read_at")
    var lastReadAt: Instant? = null,

    @Comment("채팅방 고정 여부")
    @Column(name = "is_pinned", nullable = false)
    var isPinned: Boolean = false,

    @Comment("알림 끄기 여부")
    @Column(name = "is_muted", nullable = false)
    var isMuted: Boolean = false

) : BaseEntity() {

    /**
     * 읽음 처리 (현재 시간으로 업데이트)
     */
    fun markAsRead() {
        this.lastReadAt = Instant.now()
    }

    /**
     * 특정 시간으로 읽음 처리
     */
    fun markAsRead(readAt: Instant) {
        this.lastReadAt = readAt
    }

    /**
     * 채팅방 고정
     */
    fun pin() {
        this.isPinned = true
    }

    /**
     * 채팅방 고정 해제
     */
    fun unpin() {
        this.isPinned = false
    }

    /**
     * 고정 토글
     */
    fun togglePin() {
        this.isPinned = !this.isPinned
    }

    /**
     * 알림 끄기
     */
    fun mute() {
        this.isMuted = true
    }

    /**
     * 알림 켜기
     */
    fun unmute() {
        this.isMuted = false
    }

    /**
     * 알림 토글
     */
    fun toggleMute() {
        this.isMuted = !this.isMuted
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