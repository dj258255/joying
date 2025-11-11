package com.joying.chat.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.joying.chat.domain.PushSubscription
import com.joying.chat.dto.PushSubscriptionRequest
import com.joying.chat.repository.PushSubscriptionRepository
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Web Push 알림 서비스
 */
@Service
class WebPushService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val pushService: PushService?,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    private val isPushEnabled: Boolean
        get() = pushService != null

    /**
     * 푸시 구독 등록
     */
    @Transactional
    fun subscribe(memberId: Long, request: PushSubscriptionRequest): PushSubscription {
        // 이미 존재하는 구독이면 업데이트
        val existing = pushSubscriptionRepository.findByEndpoint(request.endpoint)
        if (existing.isPresent) {
            val subscription = existing.get()
            subscription.memberId = memberId
            subscription.p256dh = request.p256dh
            subscription.auth = request.auth
            subscription.userAgent = request.userAgent
            return pushSubscriptionRepository.save(subscription)
        }

        // 새로운 구독 생성
        val subscription = PushSubscription(
            memberId = memberId,
            endpoint = request.endpoint,
            p256dh = request.p256dh,
            auth = request.auth,
            userAgent = request.userAgent
        )
        return pushSubscriptionRepository.save(subscription)
    }

    /**
     * 푸시 구독 해제
     */
    @Transactional
    fun unsubscribe(endpoint: String) {
        pushSubscriptionRepository.deleteByEndpoint(endpoint)
    }

    /**
     * 회원의 모든 구독 조회
     */
    fun getSubscriptions(memberId: Long): List<PushSubscription> {
        return pushSubscriptionRepository.findByMemberId(memberId)
    }

    /**
     * 특정 회원에게 푸시 알림 전송 (비동기)
     */
    @Async
    fun sendNotification(memberId: Long, payload: PushNotificationPayload) {
        // 푸시 서비스가 비활성화되어 있으면 건너뛰기
        if (!isPushEnabled) {
            logger.debug("푸시 알림 서비스가 비활성화되어 있습니다 (VAPID 키 미설정)")
            return
        }

        try {
            val subscriptions = pushSubscriptionRepository.findByMemberId(memberId)
            if (subscriptions.isEmpty()) {
                logger.debug("회원 ID $memberId 에 대한 푸시 구독 정보가 없습니다")
                return
            }

            val payloadJson = objectMapper.writeValueAsString(payload)

            subscriptions.forEach { subscription ->
                try {
                    val notification = Notification(
                        subscription.endpoint,
                        subscription.p256dh,
                        subscription.auth,
                        payloadJson
                    )
                    val response = pushService!!.send(notification)

                    // 410 Gone: 구독이 만료되었거나 삭제됨
                    if (response.statusLine.statusCode == 410) {
                        logger.info("구독 만료: endpoint=${subscription.endpoint}")
                        pushSubscriptionRepository.delete(subscription)
                    }
                    // 404/400: 잘못된 구독 정보
                    else if (response.statusLine.statusCode in listOf(404, 400)) {
                        logger.warn("잘못된 구독 정보: endpoint=${subscription.endpoint}")
                        pushSubscriptionRepository.delete(subscription)
                    }
                    // 성공
                    else if (response.statusLine.statusCode in 200..299) {
                        logger.debug("푸시 알림 전송 성공: memberId=$memberId")
                    }
                    // 기타 오류
                    else {
                        logger.error("푸시 알림 전송 실패: statusCode=${response.statusLine.statusCode}, memberId=$memberId")
                    }
                } catch (e: Exception) {
                    logger.error("푸시 알림 전송 중 오류: memberId=$memberId, endpoint=${subscription.endpoint}", e)
                }
            }
        } catch (e: Exception) {
            logger.error("푸시 알림 전송 실패: memberId=$memberId", e)
        }
    }
}

/**
 * 푸시 알림 페이로드
 */
data class PushNotificationPayload(
    val title: String,
    val body: String,
    val icon: String? = null,
    val image: String? = null,
    val badge: String? = null,
    val tag: String? = null,
    val data: Map<String, Any> = emptyMap()
)