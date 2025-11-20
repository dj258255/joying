package com.joying.chat.dto

import jakarta.validation.constraints.NotNull

/**
 * 채팅방 생성 요청 DTO
 */
data class CreateChatRoomRequest(
    @field:NotNull(message = "상품 ID는 필수입니다")
    val productId: Long
)