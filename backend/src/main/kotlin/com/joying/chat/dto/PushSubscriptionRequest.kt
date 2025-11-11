package com.joying.chat.dto

import jakarta.validation.constraints.NotBlank

/**
 * Web Push 구독 등록 요청
 */
data class PushSubscriptionRequest(
    @field:NotBlank(message = "엔드포인트는 필수입니다")
    val endpoint: String,

    @field:NotBlank(message = "p256dh 키는 필수입니다")
    val p256dh: String,

    @field:NotBlank(message = "auth 키는 필수입니다")
    val auth: String,

    val userAgent: String? = null
)

/**
 * Web Push 구독 해제 요청
 */
data class PushUnsubscribeRequest(
    @field:NotBlank(message = "엔드포인트는 필수입니다")
    val endpoint: String
)