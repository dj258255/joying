package com.joying.chat.dto

/**
 * 채팅방 설정 Request
 */
data class UpdateChatRoomSettingsRequest(
    val isPinned: Boolean? = null,
    val isMuted: Boolean? = null
)

/**
 * 채팅방 설정 Response
 */
data class ChatRoomSettingsDto(
    val isPinned: Boolean,
    val isMuted: Boolean
)