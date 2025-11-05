package com.joying.chat.dto

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomStatus
import java.time.Instant

/**
 * 채팅방 응답 DTO
 *
 * 목록 조회와 상세 조회 모두 사용
 * - 목록: member = null
 * - 상세: member != null (include=member 파라미터)
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
    val isMuted: Boolean,

    // 상세 조회 시에만 포함 (선택적)
    val member: MemberInfo? = null
) {
    /**
     * 참여자 상세 정보 (include=member 파라미터로 요청 시 포함)
     */
    data class MemberInfo(
        val isOnline: Boolean,
        val lastSeenAt: Instant?
    )
}