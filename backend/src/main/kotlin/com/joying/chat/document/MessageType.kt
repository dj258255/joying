package com.joying.chat.document

/**
 * 메시지 타입
 */
enum class MessageType {
    /**
     * 텍스트 메시지
     */
    TEXT,

    /**
     * 이미지 메시지
     */
    IMAGE,

    /**
     * 파일 메시지
     */
    FILE,

    /**
     * 시스템 메시지 (대여 요청, 상태 변경 등)
     */
    SYSTEM
}