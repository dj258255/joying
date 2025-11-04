package com.joying.chat.dto

import java.time.Instant

/**
 * 채팅방 참여자 정보 DTO
 *
 * 상대방 정보 + 온라인 상태 + 내 설정
 */
data class ChatRoomMemberDto(
    // 상대방 기본 정보
    val memberId: Long,
    val nickname: String,
    val profileUrl: String?,

    // 온라인 상태
    val isOnline: Boolean,
    val lastSeenAt: Instant?,

    // 내 채팅방 설정
    val isPinned: Boolean,
    val isMuted: Boolean,
    val lastReadAt: Instant?,

    // 채팅방 정보
    val chatRoomId: Long,
    val productId: Long,
    val productTitle: String
)
