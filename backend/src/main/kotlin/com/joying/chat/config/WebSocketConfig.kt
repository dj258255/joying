package com.joying.chat.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

/**
 * WebSocket STOMP 설정
 *
 * 실시간 채팅을 위한 WebSocket 설정
 * - STOMP 프로토콜 사용
 * - SockJS Fallback 지원
 */
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
    @Value("\${cors.allowed-origins}")
    private val allowedOrigins: List<String>
) : WebSocketMessageBrokerConfigurer {

    /**
     * Message Broker 설정
     *
     * - Application Prefix: /app (클라이언트 → 서버)
     * - Simple Broker: /topic, /queue (서버 → 클라이언트)
     */
    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Application Destination Prefix
        // 클라이언트가 메시지를 보낼 때 사용
        // 예: SEND /app/chat/123/send
        registry.setApplicationDestinationPrefixes("/app")

        // Simple Broker
        // 서버가 클라이언트에게 메시지를 브로드캐스트할 때 사용
        // /topic: 1:N (채팅방 전체)
        // /queue: 1:1 (개인 메시지)
        registry.enableSimpleBroker("/topic", "/queue")

        // User Destination Prefix
        // 특정 사용자에게만 메시지 전송 시 사용
        // 예: /user/{username}/queue/messages
        registry.setUserDestinationPrefix("/user")
    }

    /**
     * STOMP Endpoint 등록
     *
     * - Endpoint: /ws/chat
     * - SockJS Fallback 지원 (WebSocket 미지원 브라우저 대응)
     * - CORS 허용
     */
    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws/chat")  // WebSocket 연결 endpoint
            .setAllowedOriginPatterns(*allowedOrigins.toTypedArray())  // CORS 허용
            .withSockJS()  // SockJS Fallback 활성화
    }
}