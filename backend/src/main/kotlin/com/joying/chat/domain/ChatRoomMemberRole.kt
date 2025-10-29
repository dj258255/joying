package com.joying.chat.domain

/**
 * 채팅방 참여자 역할
 *
 * - OWNER: 대여자 (물건 제공자)
 * - RENTER: 대여받는 사람
 */
enum class ChatRoomMemberRole {
    OWNER,
    RENTER
}