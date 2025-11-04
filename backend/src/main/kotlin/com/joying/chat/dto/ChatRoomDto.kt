package com.joying.chat.dto

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomStatus
import java.time.Instant

/**
 * 채팅방 목록 응답 DTO
 */
data class ChatRoomDto(
    val chatRoomId: Long,
    val productId: Long,
    val productTitle: String,
    val productImageUrl: String?,
    val otherMemberId: Long,
    val otherMemberNickname: String,
    val otherMemberProfileUrl: String?,
    val lastMessage: String?,
    val lastMessageAt: Instant?,
    val unreadCount: Long,
    val status: ChatRoomStatus,
    val isPinned: Boolean,
    val isMuted: Boolean
)