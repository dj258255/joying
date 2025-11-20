package com.joying.chat.dto

import com.joying.chat.document.ChatMessage
import com.joying.chat.document.MessageType
import java.time.Instant

/**
 * 채팅 메시지 Response DTO
 *
 * WebSocket 메시지 전송 및 REST API 응답용
 */
data class ChatMessageResponse(
    val id: String?,
    val chatRoomId: Long,
    val senderId: Long,
    val receiverId: Long? = null,  // 수신자 ID (WebSocket 브로드캐스트 최적화용)
    val type: MessageType,
    val content: String,
    val imageUrl: String? = null,
    val fileUrl: String? = null,
    val fileName: String? = null,
    val fileSize: Long? = null,
    val replyToMessageId: String? = null,
    val createdAt: Instant?,
    val updatedAt: Instant? = null,
    val isEdited: Boolean = false,
    val originalContent: String? = null,
    val isDeleted: Boolean = false,
    val isRead: Boolean = false,
    val replyTo: ReplyMessageInfo? = null,
) {
    data class ReplyMessageInfo(
        val id: String?,
        val senderId: Long?,
        val content: String?,
        val isDeleted: Boolean = false
    )
    companion object {
        /**
         * ChatMessage → ChatMessageResponse 변환
         *
         * @param message 변환할 메시지
         * @param replyMessage 답장 대상 메시지 (있을 경우)
         */
        fun from(message: ChatMessage, replyMessage: ChatMessage? = null): ChatMessageResponse =
            ChatMessageResponse(
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
                updatedAt = message.updatedAt,
                isEdited = message.isEdited,
                originalContent = message.originalContent,
                isDeleted = message.isDeleted,
                isRead = message.isRead,
                replyTo = replyMessage?.let {
                    ReplyMessageInfo(
                        id = it.id,
                        senderId = it.senderId,
                        content = if (it.isDeleted) null else it.content,
                        isDeleted = it.isDeleted
                    )
                }
            )
    }
}
