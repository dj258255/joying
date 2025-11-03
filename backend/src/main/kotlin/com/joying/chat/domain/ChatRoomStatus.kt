package com.joying.chat.domain

/**
 * 채팅방 상태
 */
enum class ChatRoomStatus {
    /**
     * 활성 상태 (정상 채팅 가능)
     */
    ACTIVE,

    /**
     * 종료 상태 (상호 동의 또는 나가기)
     */
    CLOSED,

    /**
     * 자동 종료 (30일 미사용, 거래 완료 후 7일 등)
     */
    AUTO_CLOSED
}