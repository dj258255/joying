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

    /**
     * 푸시 알림 서비스 활성화 여부 확인
     */
    fun isPushEnabled(): Boolean = pushService != null

    /**
     * 푸시 구독 등록
     *
     * 동일한 사용자가 여러 기기/브라우저에서 구독할 수 있으므로,
     * endpoint 기준으로 갱신하되, VAPID 키 변경에 대응하기 위해
     * 오래된 구독은 자동으로 정리됩니다.
     */
    @Transactional
    fun subscribe(memberId: Long, request: PushSubscriptionRequest): PushSubscription {
        // 1. 동일한 endpoint가 있으면 업데이트 (재구독 케이스)
        val existingByEndpoint = pushSubscriptionRepository.findByEndpoint(request.endpoint)
        if (existingByEndpoint.isPresent) {
            val subscription = existingByEndpoint.get()
            subscription.memberId = memberId
            subscription.p256dh = request.p256dh
            subscription.auth = request.auth
            subscription.userAgent = request.userAgent
            logger.info("푸시 구독 갱신: memberId=$memberId, endpoint=${request.endpoint.take(50)}...")
            return pushSubscriptionRepository.save(subscription)
        }

        // 2. 동일 사용자의 구독 개수 확인 (너무 많으면 오래된 것 정리)
        val existingSubscriptions = pushSubscriptionRepository.findByMemberId(memberId)
        val maxSubscriptionsPerUser = 10 // 사용자당 최대 10개 기기/브라우저

        if (existingSubscriptions.size >= maxSubscriptionsPerUser) {
            // 가장 오래된 구독 삭제 (createdAt 기준)
            val oldestSubscription = existingSubscriptions.minByOrNull { it.createdAt }
            if (oldestSubscription != null) {
                logger.warn("구독 개수 제한 초과 - 가장 오래된 구독 삭제: memberId=$memberId, endpoint=${oldestSubscription.endpoint.take(50)}..., createdAt=${oldestSubscription.createdAt}")
                pushSubscriptionRepository.delete(oldestSubscription)
            }
        }

        // 3. 새로운 구독 생성
        val subscription = PushSubscription(
            memberId = memberId,
            endpoint = request.endpoint,
            p256dh = request.p256dh,
            auth = request.auth,
            userAgent = request.userAgent
        )
        logger.info("새 푸시 구독 생성: memberId=$memberId, endpoint=${request.endpoint.take(50)}..., 총 구독 개수=${existingSubscriptions.size + 1}")
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
        if (!isPushEnabled()) {
            logger.debug("푸시 알림 서비스가 비활성화되어 있습니다 (VAPID 키 미설정)")
            return
        }

        try {
            val subscriptions = pushSubscriptionRepository.findByMemberId(memberId)
            if (subscriptions.isEmpty()) {
                logger.info("푸시 알림 건너뜀 (구독 정보 없음): memberId=$memberId, title=${payload.title}")
                return
            }

            logger.info("푸시 알림 전송 시작: memberId=$memberId, 구독 개수=${subscriptions.size}, title=${payload.title}")

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
                    // 404/400: 잘못된 구독 정보
                    // 이러한 상태 코드가 반환되면 구독이 더 이상 유효하지 않으므로 삭제
                    if (response.statusLine.statusCode in listOf(410, 404, 400)) {
                        logger.warn("푸시 알림 실패 - 유효하지 않은 구독 (${response.statusLine.statusCode}): memberId=$memberId, endpoint=${subscription.endpoint.take(50)}..., 구독 정보 삭제")
                        pushSubscriptionRepository.delete(subscription)
                    }
                    // 성공
                    else if (response.statusLine.statusCode in 200..299) {
                        logger.info("푸시 알림 전송 성공: memberId=$memberId, statusCode=${response.statusLine.statusCode}, endpoint=${subscription.endpoint.take(50)}...")
                    }
                    // 기타 오류
                    else {
                        logger.error("푸시 알림 전송 실패 - 알 수 없는 오류: statusCode=${response.statusLine.statusCode}, memberId=$memberId, endpoint=${subscription.endpoint}")
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