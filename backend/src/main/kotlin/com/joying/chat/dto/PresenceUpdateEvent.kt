package com.joying.chat.dto

import java.time.Instant

/**
 * 온라인 상태 변경 이벤트
 *
 * WebSocket으로 전송하여 채팅방 목록의 온라인 상태를 실시간으로 업데이트
 */
data class PresenceUpdateEvent(
    val memberId: Long,
    val isOnline: Boolean,
    val lastSeenAt: Instant? = null
)