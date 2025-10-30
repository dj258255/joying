package com.joying.chat.dto

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomMemberRole
import com.joying.chat.domain.ChatRoomStatus
import java.time.Instant

/**
 * 채팅방 생성 요청 DTO
 */
data class CreateChatRoomRequest(
    val rentalHisId: Long,
    val chatRoomName: String,
    val ownerId: Long,
    val renterId: Long
)

/**
 * 채팅방 응답 DTO
 */
data class ChatRoomResponse(
    val chatRoomId: Long,
    val rentalHisId: Long,
    val name: String,
    val status: ChatRoomStatus,
    val members: List<ChatRoomMemberDto>,
    val lastMessage: MessageResponse? = null,
    val unreadCount: Int = 0,
    val createdAt: Instant?,
    val updatedAt: Instant?
) {
    companion object {
        fun from(chatRoom: ChatRoom, lastMessage: MessageResponse? = null, unreadCount: Int = 0): ChatRoomResponse {
            return ChatRoomResponse(
                chatRoomId = chatRoom.chatRoomId!!,
                rentalHisId = chatRoom.rentalHisId,
                name = chatRoom.name,
                status = chatRoom.status,
                members = chatRoom.members.map { ChatRoomMemberDto.from(it) },
                lastMessage = lastMessage,
                unreadCount = unreadCount,
                createdAt = chatRoom.createdAt,
                updatedAt = chatRoom.updatedAt
            )
        }
    }
}

/**
 * 채팅방 참여자 DTO
 */
data class ChatRoomMemberDto(
    val chatRoomMemberId: Long,
    val memberId: Long,
    val role: ChatRoomMemberRole,
    val lastReadMessageId: String?,
    val unreadCount: Int
) {
    companion object {
        fun from(member: com.joying.chat.domain.ChatRoomMember): ChatRoomMemberDto {
            return ChatRoomMemberDto(
                chatRoomMemberId = member.chatRoomMemberId!!,
                memberId = member.memberId,
                role = member.role,
                lastReadMessageId = member.lastReadMessageId,
                unreadCount = member.unreadCount
            )
        }
    }
}

/**
 * 읽지 않은 메시지 수 응답 DTO
 */
data class UnreadCountResponse(
    val totalUnreadCount: Long
)