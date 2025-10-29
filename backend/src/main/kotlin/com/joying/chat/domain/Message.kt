package com.joying.chat.domain

import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.index.CompoundIndex
import org.springframework.data.mongodb.core.index.CompoundIndexes
import org.springframework.data.mongodb.core.index.Indexed
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.core.mapping.Field
import java.time.Instant

/**
 * 채팅 메시지 Document (MongoDB)
 *
 * 대용량 메시지 저장을 위해 NoSQL 사용
 * - 읽기/쓰기 성능 최적화
 * - 샤딩 가능 (향후 확장성)
 */
@Document(collection = "messages")
@CompoundIndexes(
    CompoundIndex(
        name = "idx_chat_room_id_created_at",
        def = "{'chatRoomId': 1, 'createdAt': -1}"
    )
)
data class Message(

    @Id
    var id: String? = null,

    @Field("chatRoomId")
    @Indexed
    var chatRoomId: Long,

    @Field("senderId")
    @Indexed
    var senderId: Long,

    @Field("senderName")
    var senderName: String,

    @Field("messageType")
    var messageType: MessageType,

    @Field("content")
    var content: String,

    @Field("fileUrl")
    var fileUrl: String? = null,

    @Field("fileName")
    var fileName: String? = null,

    @Field("fileSize")
    var fileSize: Long? = null,

    @CreatedDate
    @Field("createdAt")
    var createdAt: Instant? = null

) {
    companion object {
        /**
         * 텍스트 메시지 생성
         */
        fun createTextMessage(
            chatRoomId: Long,
            senderId: Long,
            senderName: String,
            content: String
        ): Message {
            return Message(
                chatRoomId = chatRoomId,
                senderId = senderId,
                senderName = senderName,
                messageType = MessageType.TEXT,
                content = content
            )
        }

        /**
         * 이미지 메시지 생성
         */
        fun createImageMessage(
            chatRoomId: Long,
            senderId: Long,
            senderName: String,
            fileUrl: String,
            fileName: String,
            fileSize: Long
        ): Message {
            return Message(
                chatRoomId = chatRoomId,
                senderId = senderId,
                senderName = senderName,
                messageType = MessageType.IMAGE,
                content = "[이미지]",
                fileUrl = fileUrl,
                fileName = fileName,
                fileSize = fileSize
            )
        }

        /**
         * 파일 메시지 생성
         */
        fun createFileMessage(
            chatRoomId: Long,
            senderId: Long,
            senderName: String,
            fileUrl: String,
            fileName: String,
            fileSize: Long
        ): Message {
            return Message(
                chatRoomId = chatRoomId,
                senderId = senderId,
                senderName = senderName,
                messageType = MessageType.FILE,
                content = "[파일]",
                fileUrl = fileUrl,
                fileName = fileName,
                fileSize = fileSize
            )
        }

        /**
         * 시스템 메시지 생성
         */
        fun createSystemMessage(
            chatRoomId: Long,
            content: String
        ): Message {
            return Message(
                chatRoomId = chatRoomId,
                senderId = 0L,  // 시스템 메시지
                senderName = "System",
                messageType = MessageType.SYSTEM,
                content = content
            )
        }
    }
}