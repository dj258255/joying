package com.joying.chat.domain

import jakarta.persistence.*
import java.time.Instant

/**
 * Web Push 구독 정보 엔티티
 * 사용자의 브라우저 푸시 알림 구독 정보를 저장합니다.
 */
@Entity
@Table(
    name = "push_subscriptions",
    indexes = [
        Index(name = "idx_push_subscription_member_id", columnList = "member_id"),
        Index(name = "idx_push_subscription_endpoint", columnList = "endpoint", unique = true)
    ]
)
class PushSubscription(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    /**
     * 구독을 소유한 회원 ID
     */
    @Column(name = "member_id", nullable = false)
    var memberId: Long,

    /**
     * 푸시 서비스 엔드포인트 URL
     * 브라우저의 Push 서비스로 알림을 전송할 URL
     */
    @Column(name = "endpoint", nullable = false, length = 500)
    var endpoint: String,

    /**
     * P256DH 공개키 (Base64 인코딩)
     * 메시지 암호화에 사용
     */
    @Column(name = "p256dh", nullable = false, length = 500)
    var p256dh: String,

    /**
     * Auth Secret (Base64 인코딩)
     * 메시지 인증에 사용
     */
    @Column(name = "auth", nullable = false, length = 500)
    var auth: String,

    /**
     * 사용자 에이전트 정보 (선택)
     * 어떤 브라우저/디바이스에서 구독했는지 추적
     */
    @Column(name = "user_agent", length = 500)
    var userAgent: String? = null,

    /**
     * 구독 생성 시간
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    /**
     * 마지막 업데이트 시간
     */
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }
}