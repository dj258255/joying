package com.joying.chat.controller

import com.joying.chat.dto.PushSubscriptionRequest
import com.joying.chat.dto.PushUnsubscribeRequest
import com.joying.chat.service.WebPushService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

/**
 * 푸시 알림 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/push")
class PushNotificationController(
    private val webPushService: WebPushService,
    @Value("\${web-push.public-key:}")
    private val vapidPublicKey: String
) {
    private val logger = LoggerFactory.getLogger(PushNotificationController::class.java)

    /**
     * VAPID 공개키 조회
     * 프론트엔드에서 Push 구독 시 필요
     */
    @GetMapping("/vapid-public-key")
    fun getVapidPublicKey(): ResponseEntity<Map<String, String>> {
        return ResponseEntity.ok(mapOf("publicKey" to vapidPublicKey))
    }

    /**
     * 푸시 구독 등록
     */
    @PostMapping("/subscribe")
    fun subscribe(
        @Valid @RequestBody request: PushSubscriptionRequest
    ): ResponseEntity<Map<String, String>> {
        val memberId = getCurrentMemberId()

        logger.info("푸시 구독 등록 요청: memberId={}, endpoint={}", memberId, request.endpoint)

        webPushService.subscribe(memberId, request)
        return ResponseEntity.ok(mapOf("message" to "푸시 알림 구독이 등록되었습니다"))
    }

    /**
     * 푸시 구독 해제
     */
    @PostMapping("/unsubscribe")
    fun unsubscribe(
        @Valid @RequestBody request: PushUnsubscribeRequest
    ): ResponseEntity<Map<String, String>> {
        webPushService.unsubscribe(request.endpoint)
        return ResponseEntity.ok(mapOf("message" to "푸시 알림 구독이 해제되었습니다"))
    }

    /**
     * SecurityContext에서 현재 인증된 사용자 ID 반환
     *
     * JwtAuthenticationFilter가 쿠키에서 JWT 토큰을 추출하고
     * SecurityContext에 인증 정보를 설정합니다.
     *
     * @return 사용자 ID
     * @throws IllegalStateException 인증되지 않은 경우
     */
    private fun getCurrentMemberId(): Long {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw IllegalStateException("인증 정보가 없습니다")

        return authentication.name.toLong()
    }
}