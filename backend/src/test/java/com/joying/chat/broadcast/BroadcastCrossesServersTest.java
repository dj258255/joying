package com.joying.chat.broadcast;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.support.ExecutorSubscribableChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

/**
 * 타이핑과 읽음이 서버를 넘는지 확인한다.
 *
 * <p>예전에는 이것들이 발신 서버의 로컬 브로커로 바로 나갔다. 로컬 브로커는 구독 정보를
 * 자기 메모리에만 들고 있어서 다른 서버에 붙은 상대에게 닿지 않았다. 채팅 메시지 본문만
 * Redis를 타고 나머지는 전부 빠져 있었다.
 *
 * <p>여기서 재현하는 것은 전달 구조다. 서버 두 대를 실제로 띄운 것이 아니라 브로커와
 * 리스너를 두 벌 만들어 각각을 한 대로 삼았다.
 */
class BroadcastCrossesServersTest {

	private static GenericContainer<?> redis;
	private static RedisConnectionFactory connectionFactory;
	private static ObjectMapper objectMapper;

	/** 서버 한 대. 자기 브로커와 자기 구독 정보, 자기 리스너를 갖는다. */
	private static class Server {
		final ExecutorSubscribableChannel inbound = new ExecutorSubscribableChannel();
		final ExecutorSubscribableChannel outbound = new ExecutorSubscribableChannel();
		final ExecutorSubscribableChannel brokerChannel = new ExecutorSubscribableChannel();
		final SimpMessagingTemplate messagingTemplate;
		final RedisMessageListenerContainer listenerContainer;

		Server() {
			SimpleBrokerMessageHandler broker =
				new SimpleBrokerMessageHandler(inbound, outbound, brokerChannel, null);
			broker.start();
			messagingTemplate = new SimpMessagingTemplate(brokerChannel);

			listenerContainer = new RedisMessageListenerContainer();
			listenerContainer.setConnectionFactory(connectionFactory);
			listenerContainer.addMessageListener(
				new ChatBroadcastListener(messagingTemplate, objectMapper),
				new ChannelTopic(ChatBroadcast.CHANNEL));
			listenerContainer.afterPropertiesSet();
			listenerContainer.start();
		}

		void connectAndSubscribe(String sessionId, String destination, MessageHandler handler) {
			outbound.subscribe(handler);

			SimpMessageHeaderAccessor connect = SimpMessageHeaderAccessor.create(SimpMessageType.CONNECT);
			connect.setSessionId(sessionId);
			inbound.send(MessageBuilder.createMessage(new byte[0], connect.getMessageHeaders()));

			SimpMessageHeaderAccessor sub = SimpMessageHeaderAccessor.create(SimpMessageType.SUBSCRIBE);
			sub.setSessionId(sessionId);
			sub.setSubscriptionId("sub-1");
			sub.setDestination(destination);
			inbound.send(MessageBuilder.createMessage(new byte[0], sub.getMessageHeaders()));
		}

		void stop() {
			try {
				listenerContainer.stop();
				listenerContainer.destroy();
			} catch (Exception ignored) {
				// 테스트 정리 중 실패는 결과에 영향을 주지 않는다
			}
		}
	}

	/**
	 * 브로커는 CONNECT 응답도 같은 채널로 보낸다. 목적지가 맞는 MESSAGE만 센다.
	 */
	private static MessageHandler countOnly(String destination, CountDownLatch latch,
											AtomicReference<Object> payload) {
		return message -> {
			SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
			if (SimpMessageType.MESSAGE.equals(accessor.getMessageType())
				&& destination.equals(accessor.getDestination())) {
				payload.set(message.getPayload());
				latch.countDown();
			}
		};
	}

	@BeforeAll
	static void startRedis() {
		redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);
		redis.start();
		LettuceConnectionFactory factory =
			new LettuceConnectionFactory(redis.getHost(), redis.getMappedPort(6379));
		factory.afterPropertiesSet();
		connectionFactory = factory;
		// 애플리케이션의 ObjectMapper와 같은 조건으로 만든다. Kotlin 데이터 클래스를
		// 읽으려면 클래스패스의 모듈이 등록돼 있어야 하고, 스프링은 그것을 자동으로 한다.
		objectMapper = JsonMapper.builder().findAndAddModules().build();
	}

	@AfterAll
	static void stopRedis() {
		if (redis != null) {
			redis.stop();
		}
	}

	private ChatBroadcaster broadcasterOnServerA() {
		return new ChatBroadcaster(new StringRedisTemplate(connectionFactory), objectMapper);
	}

	@Test
	@DisplayName("서버 A에서 시작한 타이핑이 서버 B에 붙은 상대에게 닿는다")
	void typingCrossesServers() throws Exception {
		Server serverA = new Server();
		Server serverB = new Server();
		try {
			String destination = "/topic/chat/1/typing";
			CountDownLatch onB = new CountDownLatch(1);
			AtomicReference<Object> payload = new AtomicReference<>();
			serverB.connectAndSubscribe("session-b", destination, countOnly(destination, onB, payload));

			broadcasterOnServerA().toTopic(destination, Map.of("chatRoomId", 1, "typing", true));

			assertThat(onB.await(5, TimeUnit.SECONDS))
				.as("예전에는 여기서 닿지 않았다")
				.isTrue();
		} finally {
			serverA.stop();
			serverB.stop();
		}
	}

	@Test
	@DisplayName("읽음도 서버를 넘는다")
	void readReceiptCrossesServers() throws Exception {
		Server serverA = new Server();
		Server serverB = new Server();
		try {
			String destination = "/topic/chat/7/read";
			CountDownLatch onB = new CountDownLatch(1);
			AtomicReference<Object> payload = new AtomicReference<>();
			serverB.connectAndSubscribe("session-b", destination, countOnly(destination, onB, payload));

			broadcasterOnServerA().toTopic(destination, Map.of("chatRoomId", 7, "readerId", 42));

			assertThat(onB.await(5, TimeUnit.SECONDS)).isTrue();
		} finally {
			serverA.stop();
			serverB.stop();
		}
	}

	@Test
	@DisplayName("페이로드를 문자열이 아니라 객체로 넘긴다. 클라이언트가 두 번 풀지 않아도 된다")
	void payloadArrivesAsObject() throws Exception {
		Server serverB = new Server();
		try {
			String destination = "/topic/chat/2/typing";
			CountDownLatch onB = new CountDownLatch(1);
			AtomicReference<Object> payload = new AtomicReference<>();
			serverB.connectAndSubscribe("session-b", destination, countOnly(destination, onB, payload));

			broadcasterOnServerA().toTopic(destination, Map.of("chatRoomId", 2, "typing", true));

			assertThat(onB.await(5, TimeUnit.SECONDS)).isTrue();

			// 브로커에 넘어간 것이 문자열이면 클라이언트가 JSON 안의 JSON을 받아
			// 한 번 더 풀어야 한다. 객체로 넘겨야 그 일이 없다.
			assertThat(payload.get())
				.as("문자열이 아니라 객체로 넘어가야 한다")
				.isInstanceOf(JsonNode.class);
			assertThat(((JsonNode) payload.get()).get("chatRoomId").asInt()).isEqualTo(2);
			assertThat(((JsonNode) payload.get()).get("typing").asBoolean()).isTrue();
		} finally {
			serverB.stop();
		}
	}

	@Test
	@DisplayName("Redis가 죽어도 부르는 쪽의 작업을 되돌리지 않는다")
	void publishFailureDoesNotThrow() {
		LettuceConnectionFactory broken = new LettuceConnectionFactory("127.0.0.1", 1);
		broken.afterPropertiesSet();
		ChatBroadcaster broadcaster =
			new ChatBroadcaster(new StringRedisTemplate(broken), objectMapper);

		broadcaster.toTopic("/topic/chat/1/typing", Map.of("typing", true));
		broadcaster.toUser(1L, "/queue/chatroom-update", Map.of("roomId", 1));
		// 예외가 올라오지 않는다. 타이핑 표시가 한 번 빠지는 것보다
		// 저장된 것을 되돌리는 쪽이 훨씬 비싸다.
	}
}
