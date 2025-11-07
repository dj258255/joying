package com.joying.chat.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration

/**
 * WebSocket STOMP 설정
 *
 * 실시간 채팅을 위한 WebSocket 설정
 * - STOMP 프로토콜 사용
 * - SockJS Fallback 지원
 * - Rate Limiting 및 연결 제한
 * - Backpressure 설정
 */
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
    @Value("\${cors.allowed-origins}")
    private val allowedOrigins: List<String>,
    private val webSocketAuthInterceptor: WebSocketAuthInterceptor
) : WebSocketMessageBrokerConfigurer {

    /**
     * Message Broker 설정
     *
     * - Application Prefix: /app (클라이언트 → 서버)
     * - Redis Pub/Sub: 서버 간 메시지 전달
     *
     * SimpleBroker 제거 이유:
     * - SimpleBroker는 구독 정보를 서버 메모리에 저장
     * - 서버 확장 시 다른 서버의 구독자에게 메시지 전달 불가
     * - Redis Pub/Sub으로 직접 구독 관리하여 확장성 확보
     */
    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Application Destination Prefix
        // 클라이언트가 메시지를 보낼 때 사용
        // 예: SEND /app/chat/123/send
        registry.setApplicationDestinationPrefixes("/app")

        // SimpleBroker 제거 (Redis Pub/Sub으로 대체)
        // - 기존: registry.enableSimpleBroker("/topic", "/queue")
        // - 변경: ChatMessageListener에서 직접 WebSocket 전송

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
            .setStreamBytesLimit(512 * 1024)  // 스트리밍 전송 크기 제한: 512KB
            .setHttpMessageCacheSize(1000)  // HTTP 메시지 캐시 크기: 1000개
            .setDisconnectDelay(30 * 1000)  // 연결 끊김 지연 시간: 30초
            .setHeartbeatTime(25 * 1000)  // Heartbeat 주기: 25초
    }

    /**
     * WebSocket Transport 설정
     *
     * 메시지 크기 제한, 전송 버퍼 크기 제한, 타임아웃 설정
     * → 갑작스러운 부하 증가 시 서버 보호
     */
    override fun configureWebSocketTransport(registry: WebSocketTransportRegistration) {
        registry
            .setMessageSizeLimit(128 * 1024)  // 단일 메시지 최대 크기: 128KB (이미지/파일은 별도 업로드)
            .setSendBufferSizeLimit(512 * 1024)  // 전송 버퍼 크기: 512KB
            .setSendTimeLimit(20 * 1000)  // 전송 타임아웃: 20초
            .setTimeToFirstMessage(30 * 1000)  // 첫 메시지 대기 시간: 30초 (CONNECT 이후)
    }

    /**
     * Inbound Channel 설정 (클라이언트 → 서버)
     *
     * 사용자 입력 메시지를 받아서 처리
     *
     * 부하 특성:
     * - 사람 타이핑 속도: 초당 5-10개 메시지 (최대)
     * - MongoDB 저장 + Redis Pub/Sub 발행 (I/O 작업)
     * - 상대적으로 느리지만 CPU 집약적이지 않음
     *
     * 최적화 전략:
     * - 작은 Thread Pool (20개)로 충분
     * - 큐는 중간 크기 (200개) - 급격한 스파이크 대비
     * - keepAlive 짧게 (30초) - 유휴 시 빠른 해제
     */
    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration
            // 쿠키 기반 인증 인터셉터 등록
            .interceptors(webSocketAuthInterceptor)
            .taskExecutor()
            .corePoolSize(5)  // 기본 5개 (유휴 시 최소 스레드)
            .maxPoolSize(20)  // 최대 20개 (사용자 입력은 느림)
            .queueCapacity(200)  // 대기 큐 200개 (갑작스러운 동시 전송 대비)
            .keepAliveSeconds(30)  // 30초 후 유휴 스레드 해제
    }

    /**
     * Outbound Channel 설정 (서버 → 클라이언트)
     *
     * Redis Pub/Sub에서 받은 메시지를 클라이언트에게 전송
     *
     * 부하 특성:
     * - 1:1 채팅: 1개 메시지 → 2명에게 전송 (본인 + 상대방)
     * - 네트워크 I/O 위주 (CPU는 낮음)
     * - 처리 속도 빠름 (5ms/건)
     * - 동시에 여러 채팅방에서 메시지 발생 시 순간 폭증
     *
     * 최적화 전략:
     * - Inbound 대비 2.5배 Thread Pool (50개) - 메시지 2건 + 버스트 대비
     * - 큰 큐 (1000개) - 동시 브로드캐스트 병목 방지
     * - keepAlive 길게 (60초) - 스레드 재사용 극대화
     */
    override fun configureClientOutboundChannel(registration: ChannelRegistration) {
        registration.taskExecutor()
            .corePoolSize(10)  // 기본 10개 (항상 대기)
            .maxPoolSize(50)  // 최대 50개 (Inbound 대비 2.5배, 1:1 채팅 + 버스트 대비)
            .queueCapacity(1000)  // 큐 1000개 (동시 브로드캐스트 병목 방지)
            .keepAliveSeconds(60)  // 60초 유지 (재사용 극대화)
    }
}