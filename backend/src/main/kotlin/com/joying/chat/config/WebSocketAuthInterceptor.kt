package com.joying.chat.config

import com.joying.common.config.security.JwtTokenProvider
import org.slf4j.LoggerFactory
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

/**
 * WebSocket 인증 인터셉터
 *
 * WebSocket STOMP 연결 시 쿠키에서 JWT 토큰을 추출하여 인증 처리
 * REST API와 동일한 쿠키 기반 인증 방식 사용
 */
@Component
class WebSocketAuthInterceptor(
    private val jwtTokenProvider: JwtTokenProvider
) : ChannelInterceptor {

    private val logger = LoggerFactory.getLogger(WebSocketAuthInterceptor::class.java)

    companion object {
        private const val COOKIE_HEADER = "cookie"
        private const val ACCESS_TOKEN_COOKIE_NAME = "access_token"
    }

    /**
     * 메시지 전송 전 인증 처리
     *
     * CONNECT 명령 시 쿠키에서 JWT 토큰 추출 후 SecurityContext에 인증 정보 설정
     */
    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
            ?: return message

        // CONNECT 명령일 때만 인증 처리
        if (accessor.command == StompCommand.CONNECT) {
            try {
                // 쿠키에서 JWT 토큰 추출
                val token = extractTokenFromCookie(accessor)

                if (token != null && jwtTokenProvider.validateToken(token)) {
                    // JWT에서 사용자 ID 추출
                    val memberId = jwtTokenProvider.getMemberId(token)

                    // Spring Security 인증 객체 생성
                    val authentication = UsernamePasswordAuthenticationToken(
                        memberId.toString(),
                        null,
                        emptyList()
                    )

                    // SecurityContext에 인증 정보 설정
                    SecurityContextHolder.getContext().authentication = authentication

                    // STOMP 세션에도 인증 정보 저장 (WebSocketEventListener에서 사용)
                    accessor.user = authentication

                    logger.info("WebSocket 쿠키 인증 성공: memberId={}", memberId)
                } else {
                    logger.warn("WebSocket 인증 실패: 유효하지 않은 토큰")
                }
            } catch (e: Exception) {
                logger.warn("WebSocket 인증 처리 중 오류 발생: {}", e.message)
            }
        }

        return message
    }

    /**
     * 쿠키 헤더에서 JWT 토큰 추출
     *
     * @param accessor STOMP 헤더 접근자
     * @return JWT 토큰 (없으면 null)
     */
    private fun extractTokenFromCookie(accessor: StompHeaderAccessor): String? {
        // native headers에서 cookie 헤더 추출
        val cookieHeader = accessor.getNativeHeader(COOKIE_HEADER)?.firstOrNull()
            ?: return null

        // "access_token=xxx; other=yyy" 형식에서 access_token 값 추출
        return cookieHeader.split(";")
            .map { it.trim() }
            .firstOrNull { it.startsWith("$ACCESS_TOKEN_COOKIE_NAME=") }
            ?.substring(ACCESS_TOKEN_COOKIE_NAME.length + 1) // "access_token=" 제거
    }
}