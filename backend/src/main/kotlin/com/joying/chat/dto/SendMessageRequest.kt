package com.joying.chat.dto

import com.joying.chat.document.MessageType
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

/**
 * 메시지 전송 요청 DTO
 */
data class SendMessageRequest(
    @field:NotNull(message = "메시지 타입은 필수입니다")
    val type: MessageType,

    @field:NotBlank(message = "메시지 내용은 필수입니다")
    val content: String,

    val imageUrl: String? = null,

    val fileUrl: String? = null,

    val fileName: String? = null,

    val fileSize: Long? = null,

    val replyToMessageId: String? = null
)