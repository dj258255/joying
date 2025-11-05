package com.joying.chat.websocket

import com.joying.chat.service.ChatPresenceService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionConnectedEvent
import org.springframework.web.socket.messaging.SessionDisconnectEvent

/**
 * WebSocket 연결/해제 이벤트 리스너
 *
 * WebSocket 연결 시 즉시 온라인 상태 설정
 * WebSocket 해제 시 즉시 오프라인 상태 설정
 *
 * 인증은 WebSocketAuthInterceptor가 쿠키에서 JWT를 추출하여 처리
 */
@Component
class WebSocketEventListener(
    private val chatPresenceService: ChatPresenceService
) {
    private val logger = LoggerFactory.getLogger(WebSocketEventListener::class.java)

    /**
     * WebSocket 연결 이벤트 처리
     *
     * 클라이언트가 WebSocket에 연결하면 즉시 온라인 상태로 설정
     * (기존에는 첫 heartbeat까지 최대 30초 대기 필요했음)
     */
    @EventListener
    fun handleSessionConnected(event: SessionConnectedEvent) {
        try {
            val memberId = extractMemberIdFromEvent(event)

            // 즉시 온라인 상태 설정
            chatPresenceService.setOnline(memberId)

            logger.info("WebSocket 연결 완료 - 온라인 상태 설정: memberId={}", memberId)
        } catch (e: Exception) {
            // JWT 토큰이 없거나 유효하지 않은 경우 (예: 테스트 환경)
            logger.warn("WebSocket 연결 이벤트 처리 실패: {}", e.message)
        }
    }

    /**
     * WebSocket 해제 이벤트 처리
     *
     * 클라이언트가 WebSocket 연결을 끊으면 즉시 오프라인 상태로 설정
     * (기존에는 5분 TTL 만료까지 "온라인" 상태 유지되었음)
     */
    @EventListener
    fun handleSessionDisconnect(event: SessionDisconnectEvent) {
        try {
            val memberId = extractMemberIdFromEvent(event)

            // 즉시 오프라인 상태 설정 + 마지막 접속 시간 기록
            chatPresenceService.setOffline(memberId)

            logger.info("WebSocket 연결 해제 - 오프라인 상태 설정: memberId={}", memberId)
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