package com.joying.chat.dto

import java.time.Instant

/**
 * 채팅방 목록 실시간 업데이트 이벤트
 *
 * 메시지 전송 시 수신자에게 전송하여 채팅방 목록을 실시간으로 업데이트
 * - lastMessage: 마지막 메시지 내용
 * - lastMessageAt: 마지막 메시지 시간
 * - unreadCount: 안읽은 메시지 개수 (수신자 입장)
 */
data class ChatRoomUpdateEvent(
    val chatRoomId: Long,
    val lastMessage: String,
    val lastMessageAt: Instant,
    val unreadCount: Long
)