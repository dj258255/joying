package com.joying.chat.domain

/**
 * 메시지 타입
 *
 * - TEXT: 일반 텍스트 메시지
 * - IMAGE: 이미지 메시지
 * - FILE: 파일 메시지
 * - SYSTEM: 시스템 메시지 (입장, 퇴장 등)
 */
enum class MessageType {
    TEXT,
    IMAGE,
    FILE,
    SYSTEM
}