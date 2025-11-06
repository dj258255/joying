package com.joying.chat.websocket

import com.joying.chat.service.ChatPresenceService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionConnectedEvent
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.util.concurrent.TimeUnit

/**
 * WebSocket 연결/해제 이벤트 리스너
 *
 * WebSocket 연결 시:
 * - 온라인 상태 설정
 * - Redis에 세션 정보 저장 (서버 확장 대비)
 *
 * WebSocket 해제 시:
 * - 오프라인 상태 설정
 * - Redis에서 세션 정보 제거
 *
 * 인증은 WebSocketAuthInterceptor가 쿠키에서 JWT를 추출하여 처리
 */
@Component
class WebSocketEventListener(
    private val chatPresenceService: ChatPresenceService,
    private val redis: RedisTemplate<String, String>
) {
    private val logger = LoggerFactory.getLogger(WebSocketEventListener::class.java)

    companion object {
        private const val SESSION_KEY_PREFIX = "websocket:session:member:"
        private const val SESSION_TTL_HOURS = 2L
    }

    /**
     * WebSocket 연결 이벤트 처리
     *
     * 클라이언트가 WebSocket에 연결하면:
     * 1. 온라인 상태 설정
     * 2. Redis에 세션 정보 저장 (서버 확장 시 다른 서버가 참조 가능)
     */
    @EventListener
    fun handleSessionConnected(event: SessionConnectedEvent) {
        try {
            val accessor = StompHeaderAccessor.wrap(event.message)
            val memberId = extractMemberIdFromEvent(event)
            val sessionId = accessor.sessionId ?: throw IllegalStateException("세션 ID가 없습니다")

            // 1. 즉시 온라인 상태 설정
            chatPresenceService.setOnline(memberId)

            // 2. Redis에 세션 정보 저장 (서버 확장 대비)
            // Key: websocket:session:member:{memberId}
            // Value: {sessionId} (Set 자료구조 - 한 유저가 여러 기기에서 접속 가능)
            val key = SESSION_KEY_PREFIX + memberId
            redis.opsForSet().add(key, sessionId)
            redis.expire(key, SESSION_TTL_HOURS, TimeUnit.HOURS)

            logger.info(
                "WebSocket 연결 완료: memberId={}, sessionId={}, 세션 Redis 저장",
                memberId,
                sessionId
            )
        } catch (e: Exception) {
            // JWT 토큰이 없거나 유효하지 않은 경우 (예: 테스트 환경)
            logger.warn("WebSocket 연결 이벤트 처리 실패: {}", e.message)
        }
    }

    /**
     * WebSocket 해제 이벤트 처리
     *
     * 클라이언트가 WebSocket 연결을 끊으면:
     * 1. 오프라인 상태 설정
     * 2. Redis에서 세션 정보 제거
     */
    @EventListener
    fun handleSessionDisconnect(event: SessionDisconnectEvent) {
        try {
            val accessor = StompHeaderAccessor.wrap(event.message)
            val memberId = extractMemberIdFromEvent(event)
            val sessionId = accessor.sessionId ?: throw IllegalStateException("세션 ID가 없습니다")

            // 1. 즉시 오프라인 상태 설정 + 마지막 접속 시간 기록
            chatPresenceService.setOffline(memberId)

            // 2. Redis에서 세션 정보 제거
            val key = SESSION_KEY_PREFIX + memberId
            redis.opsForSet().remove(key, sessionId)

            logger.info(
                "WebSocket 연결 해제: memberId={}, sessionId={}, 세션 Redis 제거",
                memberId,
                sessionId
            )
        } catch (e: Exception) {
            // JWT 토큰이 없거나 유효하지 않은 경우
            logger.warn("WebSocket 해제 이벤트 처리 실패: {}", e.message)
        }
    }

    /**
     * WebSocket 이벤트에서 사용자 ID 반환
     *
     * WebSocketAuthInterceptor가 쿠키에서 JWT를 추출하여 설정한 user principal 사용
     *
     * @param event SessionConnectedEvent 또는 SessionDisconnectEvent
     * @return 사용자 ID
     * @throws IllegalArgumentException 인증되지 않은 경우
     */
    private fun extractMemberIdFromEvent(event: Any): Long {
        val accessor = when (event) {
            is SessionConnectedEvent -> StompHeaderAccessor.wrap(event.message)
            is SessionDisconnectEvent -> StompHeaderAccessor.wrap(event.message)
            else -> throw IllegalArgumentException("지원하지 않는 이벤트 타입입니다")
        }

        // WebSocketAuthInterceptor가 설정한 user principal에서 memberId 추출
        val principal = accessor.user
            ?: throw IllegalArgumentException("인증되지 않은 사용자입니다")

        return principal.name.toLong()
    }
}