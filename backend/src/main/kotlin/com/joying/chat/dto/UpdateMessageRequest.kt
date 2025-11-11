package com.joying.chat.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 메시지 수정 Request
 */
data class UpdateMessageRequest(
    @field:NotBlank(message = "메시지 내용은 필수입니다")
    @field:Size(max = 5000, message = "메시지는 5000자를 초과할 수 없습니다")
    val content: String,
)
