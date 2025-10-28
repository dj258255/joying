package com.joying.chat.domain

import jakarta.persistence.*
import org.hibernate.annotations.Comment

/**
 * 채팅방 엔티티 (MySQL)
 *
 * 대여 거래마다 자동으로 생성되는 1:1 채팅방
 * - rentalHisId와 1:1 매핑
 * - 채팅방 참여자(ChatRoomMember) 관리
 */
@Entity
@Table(
    name = "chat_room",
    indexes = [
        Index(name = "idx_chat_room_rental_his_id", columnList = "rental_his_id")
    ]
)
class ChatRoom(

    @Id
    @Column(name = "chat_room_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var chatRoomId: Long? = null,

    @Comment("대여 거래 ID (RentalHistory FK - 논리적 참조)")
    @Column(name = "rental_his_id", nullable = false, unique = true)
    var rentalHisId: Long,

    @Comment("채팅방 이름 (기본: 상품명)")
    @Column(name = "name", nullable = false)
    var name: String,

    @Comment("채팅방 상태 (ACTIVE: 활성, CLOSED: 종료)")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ChatRoomStatus = ChatRoomStatus.ACTIVE,

    @Comment("채팅방 참여자 목록")
    @OneToMany(mappedBy = "chatRoom", cascade = [CascadeType.ALL], orphanRemoval = true)
    var members: MutableList<ChatRoomMember> = mutableListOf()

) : BaseEntity() {

    /**
     * 채팅방 참여자 추가 (연관관계 편의 메서드)
     */
    fun addMember(member: ChatRoomMember) {
        members.add(member)
        member.chatRoom = this
    }

    /**
     * 채팅방 참여자 제거 (연관관계 편의 메서드)
     */
    fun removeMember(member: ChatRoomMember) {
        members.remove(member)
        member.chatRoom = null
    }

    /**
     * 채팅방 종료
     */
    fun close() {
        this.status = ChatRoomStatus.CLOSED
    }

    /**
     * 채팅방 재활성화
     */
    fun reopen() {
        this.status = ChatRoomStatus.ACTIVE
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChatRoom) return false
        return chatRoomId != null && chatRoomId == other.chatRoomId
    }

    override fun hashCode(): Int {
        return chatRoomId?.hashCode() ?: 0
    }
}

/**
 * 채팅방 상태
 */
enum class ChatRoomStatus {
    ACTIVE,  // 활성
    CLOSED   // 종료
}
