package com.joying.chat.dto

import com.joying.chat.domain.MessageType
import java.time.Instant

/**
 * 채팅 메시지 전송 요청 DTO
 */
data class SendMessageRequest(
    val chatRoomId: Long,
    val senderId: Long,
    val senderName: String,
    val content: String,
    val messageType: MessageType = MessageType.TEXT
)

/**
 * 채팅 메시지 응답 DTO
 */
data class MessageResponse(
    val id: String,
    val chatRoomId: Long,
    val senderId: Long,
    val senderName: String,
    val messageType: MessageType,
    val content: String,
    val fileUrl: String? = null,
    val fileName: String? = null,
    val fileSize: Long? = null,
    val createdAt: Instant?
)

/**
 * 읽음 처리 요청 DTO
 */
data class MarkAsReadRequest(
    val chatRoomId: Long,
    val memberId: Long,
    val messageId: String
)