package com.joying.chat.dto

import com.joying.chat.document.ChatMessage
import com.joying.chat.document.MessageType
import java.time.LocalDateTime

/**
 * 채팅 메시지 DTO
 *
 * WebSocket 메시지 전송 및 REST API 응답용
 */
data class ChatMessageDto(
    val id: String?,
    val chatRoomId: Long,
    val senderId: Long,
    val type: MessageType,
    val content: String,
    val imageUrl: String? = null,
    val fileUrl: String? = null,
    val fileName: String? = null,
    val fileSize: Long? = null,
    val replyToMessageId: String? = null,
    val createdAt: LocalDateTime?,
    val isDeleted: Boolean = false
) {
    companion object {
        /**
         * ChatMessage → ChatMessageDto 변환
         */
        fun from(message: ChatMessage): ChatMessageDto {
            return ChatMessageDto(
                id = message.id,
                chatRoomId = message.chatRoomId,
                senderId = message.senderId,
                type = message.type,
                content = message.content,
                imageUrl = message.imageUrl,
                fileUrl = message.fileUrl,
                fileName = message.fileName,
                fileSize = message.fileSize,
                replyToMessageId = message.replyToMessageId,
                createdAt = message.createdAt,
                isDeleted = message.isDeleted
            )
        }
    }
}