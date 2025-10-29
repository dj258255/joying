package com.joying.chat.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

/**
 * WebSocket STOMP 설정
 *
 * 단일 서버 구성 - 인메모리 메시지 브로커 사용
 * Redis Pub/Sub 불필요 (서버 1대)
 *
 * 클라이언트 연결:
 * - ws://localhost:8080/ws/chat
 * - 구독: /topic/chat/{chatRoomId}
 * - 전송: /app/chat.send
 */
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig : WebSocketMessageBrokerConfigurer {

    /**
     * STOMP 엔드포인트 등록
     *
     * 클라이언트는 /ws/chat으로 WebSocket 연결
     */
    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/ws/chat")
            .setAllowedOriginPatterns("*")  // CORS 설정 (프로덕션에서는 구체적으로 지정)
            .withSockJS()  // SockJS 폴백 지원 (WebSocket 미지원 브라우저 대비)
    }

    /**
     * 메시지 브로커 설정
     *
     * - /topic: 구독 경로 (서버 → 클라이언트 브로드캐스팅)
     * - /app: 메시지 전송 경로 (클라이언트 → 서버)
     */
    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // 인메모리 브로커 활성화 (서버 1대이므로 충분)
        registry.enableSimpleBroker("/topic", "/queue")
            .setHeartbeatValue(longArrayOf(25000, 25000))  // 25초마다 Heartbeat
            .setTaskScheduler(taskScheduler())  // TaskScheduler 설정

        // 클라이언트에서 서버로 메시지 전송 시 prefix
        registry.setApplicationDestinationPrefixes("/app")

        // 특정 사용자에게만 전송 시 prefix
        registry.setUserDestinationPrefix("/user")
    }

    /**
     * WebSocket Heartbeat용 TaskScheduler
     *
     * SimpleBroker의 heartbeat 처리를 위해 필요
     */
    @Bean
    fun taskScheduler(): TaskScheduler {
        return ThreadPoolTaskScheduler().apply {
            poolSize = 10  // 동시 처리 가능한 작업 수
            setThreadNamePrefix("websocket-heartbeat-")
            initialize()
        }
    }
}