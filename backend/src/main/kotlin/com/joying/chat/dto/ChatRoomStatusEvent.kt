package com.joying.chat.dto

import com.joying.chat.domain.ChatRoomStatus
import java.time.Instant

/**
 * 채팅방 상태 변경 실시간 알림 이벤트
 *
 * 채팅방 나가기, 재입장, 자동 종료 등의 이벤트를 상대방에게 실시간 알림
 */
data class ChatRoomStatusEvent(
    val chatRoomId: Long,
    val eventType: EventType,
    val memberId: Long, // 이벤트를 발생시킨 사용자 ID
    val memberNickname: String?, // 이벤트를 발생시킨 사용자 닉네임 (선택)
    val status: ChatRoomStatus? = null, // 채팅방 상태 (자동 종료 시)
    val timestamp: Instant = Instant.now(),
) {
    enum class EventType {
        MEMBER_LEFT, // 상대방이 나갔습니다
        MEMBER_REJOINED, // 상대방이 다시 들어왔습니다
        ROOM_CLOSED, // 채팅방이 자동 종료되었습니다
    }
}
