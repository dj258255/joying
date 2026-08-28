package com.joying.chat.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import lombok.RequiredArgsConstructor;

/**
 * 웹소켓 STOMP 설정.
 *
 * <p>브라우저가 웹소켓을 못 쓸 때를 대비해 SockJS 폴백을 켠다.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	@Value("${cors.allowed-origins}")
	private List<String> allowedOrigins;

	private final WebSocketAuthInterceptor webSocketAuthInterceptor;

	/**
	 * 브로커 설정.
	 *
	 * <p>주석에는 오래도록 SimpleBroker를 제거했다고 적혀 있었다. 그런데
	 * {@code enableSimpleBroker}도 {@code enableStompBrokerRelay}도 부르지 않으면
	 * Spring이 SimpleBroker를 자동으로 켠다. 브로커는 그대로 살아 있었고 바뀐 것은
	 * 목적지 접두사 제한이 사라진 것뿐이었다.
	 *
	 * <p>서버를 넘어야 하는 전달은 {@code ChatBroadcaster}가 Redis로 내보내고, 각
	 * 서버가 받아서 자기에게 붙은 세션에만 내보낸다. 여기 브로커는 그 마지막
	 * 한 걸음을 맡는다.
	 */
	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		// 클라이언트가 보낼 때 붙이는 접두사. 예: SEND /app/chat/123/send
		registry.setApplicationDestinationPrefixes("/app");

		// 특정 사용자에게만 보낼 때 쓴다. 예: /user/{id}/queue/messages
		registry.setUserDestinationPrefix("/user");

		// 한 사람에게 나가는 메시지를 보낸 순서대로 내보낸다.
		//
		// 켜지 않으면 송신 채널이 스레드 풀이라 같은 사람에게 갈 두 건이 서로
		// 앞지른다. 부하를 넣고 재 보니 200건 중 193번 번호가 뒤로 갔다.
		//
		// 값은 처리량이다. 앞엣것이 끝나야 뒤엣것을 보내므로 한 사람에게 몰릴 때
		// 그 사람의 줄만 길어진다. 다른 사람은 그대로 병렬이다.
		registry.setPreservePublishOrder(true);
	}

	/**
	 * 들어오는 프레임을 연결 단위로 한 줄로 세운다.
	 *
	 * <p>기본 채널은 스레드 풀이라 한 연결에서 연달아 보낸 프레임이 서로 앞지른다.
	 * 그러면 나중에 보낸 것이 먼저 번호를 받아, 보낸 사람 화면에서도 자기 말의
	 * 앞뒤가 바뀐다. 부하를 넣기 전에는 보이지 않았다.
	 *
	 * <p>연결로 묶으므로 사람이 많아져도 서로 기다리지 않는다. 한 연결 안에서만
	 * 순서를 지킨다.
	 */
	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		// 주소를 둘 받는다.
		//
		// 앞단은 방 번호로 노드를 고른다. 그 값을 쿠키로 알렸는데 쿠키는 브라우저에
		// 하나뿐이라, 탭을 둘 열어 서로 다른 방을 보면 나중 탭이 앞선 방의 열쇠로
		// 간다. 노드 3개에서 재 보니 69.1% 가 엉뚱한 노드로 갔다.
		//
		// 경로에 실으면 요청마다 다르다. SockJS 가 기본 주소 뒤에 경로를 덧붙이므로
		// 쿼리스트링은 살아남지 못하지만, 기본 주소의 경로는 그대로 남는다.
		//
		// 옛 주소도 함께 남긴다. 배포 중에는 이미 붙어 있는 연결과 옛 화면이 있다.
		registry.addEndpoint("/ws/chat", "/ws/chat/{roomId}")
			.setAllowedOriginPatterns(allowedOrigins.toArray(new String[0]))
			.withSockJS()
			.setStreamBytesLimit(512 * 1024)
			.setHttpMessageCacheSize(1000)
			.setDisconnectDelay(30 * 1000)
			.setHeartbeatTime(25 * 1000);
	}

	/**
	 * 크기와 시간에 상한을 둔다. 갑자기 몰릴 때 서버가 먼저 죽지 않게 하기 위해서다.
	 */
	@Override
	public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
		// 이미지와 파일은 따로 올리므로 메시지 자체는 클 이유가 없다
		registry.setMessageSizeLimit(128 * 1024)
			.setSendBufferSizeLimit(512 * 1024)
			.setSendTimeLimit(20 * 1000)
			.setTimeToFirstMessage(30 * 1000);
	}

	/**
	 * 클라이언트에서 서버로 들어오는 채널.
	 *
	 * <p>사람이 타이핑하는 속도라 빠르지 않다. 풀을 크게 잡을 이유가 없다.
	 */
	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration
			.interceptors(webSocketAuthInterceptor)
			// 평범한 풀 대신 연결 단위로 묶인 실행기를 쓴다. 풀에 그대로 던지면 한
			// 연결에서 연달아 보낸 프레임이 서로 앞질러, 나중에 보낸 것이 먼저 번호를
			// 받는다. 보낸 사람 화면에서도 자기 말의 앞뒤가 바뀐다.
			.executor(new SessionOrderedExecutor(
				new KeyOrderedExecutor(
					Math.max(2, Runtime.getRuntime().availableProcessors() * 2),
					"ws-inbound-")));
	}

	/**
	 * 서버에서 클라이언트로 나가는 채널.
	 *
	 * <p>한 건이 들어오면 두 사람에게 나간다. 여러 방에서 동시에 오가면 순간적으로
	 * 몰리므로 들어오는 쪽보다 넉넉하게 잡는다.
	 */
	@Override
	public void configureClientOutboundChannel(ChannelRegistration registration) {
		registration.taskExecutor()
			.corePoolSize(10)
			.maxPoolSize(50)
			.queueCapacity(1000)
			.keepAliveSeconds(60);
	}
}
