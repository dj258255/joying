package com.joying.chat.document

import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.index.CompoundIndex
import org.springframework.data.mongodb.core.index.CompoundIndexes
import org.springframework.data.mongodb.core.index.Indexed
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.core.mapping.Field
import java.time.LocalDateTime

/**
 * 채팅 메시지 Document (MongoDB)
 *
 * 대용량 메시지 저장을 위해 NoSQL 사용
 * - 쓰기 속도 최적화
 * - 스키마 유연성 (이모티콘 등 확장 가능)
 * - 샤딩 가능 (향후 확장성)
 */
@Document(collection = "chat_messages")
@CompoundIndexes(
    CompoundIndex(
        name = "idx_chat_room_id_created_at",
        def = "{'chatRoomId': 1, 'createdAt': -1}"
    )
)
data class ChatMessage(

    @Id
    var id: String? = null,

    @Field("chatRoomId")
    @Indexed
    val chatRoomId: Long,

    @Field("senderId")
    @Indexed
    val senderId: Long,

    @Field("type")
    val type: MessageType,

    @Field("content")
    val content: String,

    @Field("imageUrl")
    val imageUrl: String? = null,

    @Field("fileUrl")
    val fileUrl: String? = null,

    @Field("fileName")
    val fileName: String? = null,

    @Field("fileSize")
    val fileSize: Long? = null,

    @Field("replyToMessageId")
    val replyToMessageId: String? = null,

    @CreatedDate
    @Field("createdAt")
    var createdAt: LocalDateTime? = null,

    @Field("isDeleted")
    var isDeleted: Boolean = false

) {
    companion object {
        /**
         * 텍스트 메시지 생성
         */
        fun createTextMessage(
            chatRoomId: Long,
            senderId: Long,
            content: String,
            replyToMessageId: String? = null
        ): ChatMessage {
            return ChatMessage(
                chatRoomId = chatRoomId,
                senderId = senderId,
                type = MessageType.TEXT,
                content = content,
                replyToMessageId = replyToMessageId
            )
        }

        /**
         * 이미지 메시지 생성
         */
        fun createImageMessage(
            chatRoomId: Long,
            senderId: Long,
            imageUrl: String,
            fileName: String,
            fileSize: Long,
            replyToMessageId: String? = null
        ): ChatMessage {
            return ChatMessage(
                chatRoomId = chatRoomId,
                senderId = senderId,
                type = MessageType.IMAGE,
                content = "[이미지]",
                imageUrl = imageUrl,
                fileName = fileName,
                fileSize = fileSize,
                replyToMessageId = replyToMessageId
            )
        }

        /**
         * 파일 메시지 생성
         */
        fun createFileMessage(
            chatRoomId: Long,
            senderId: Long,
            fileUrl: String,
            fileName: String,
            fileSize: Long,
            replyToMessageId: String? = null
        ): ChatMessage {
            return ChatMessage(
                chatRoomId = chatRoomId,
                senderId = senderId,
                type = MessageType.FILE,
                content = "[파일] $fileName",
                fileUrl = fileUrl,
                fileName = fileName,
                fileSize = fileSize,
                replyToMessageId = replyToMessageId
            )
        }

        /**
         * 시스템 메시지 생성
         */
        fun createSystemMessage(
            chatRoomId: Long,
            content: String
        ): ChatMessage {
            return ChatMessage(
                chatRoomId = chatRoomId,
                senderId = 0L,  // 시스템 메시지
                type = MessageType.SYSTEM,
                content = content
            )
        }
    }

    /**
     * 메시지 삭제 (Soft Delete)
     */
    fun delete() {
        this.isDeleted = true
    }
}