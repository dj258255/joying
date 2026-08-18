package com.joying.chat.config;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.support.ExecutorSubscribableChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 서버가 두 대일 때 무엇이 건너가고 무엇이 안 건너가는지 재현한다.
 *
 * <p>채팅 메시지 본문만 Redis Pub/Sub을 탄다. 타이핑, 읽음, 접속 상태, 안읽음 배지는
 * {@code convertAndSend}로 각 서버의 로컬 브로커에 바로 나간다. 로컬 브로커는 구독 정보를
 * 자기 메모리에만 들고 있으므로 다른 서버에 붙은 상대에게는 닿지 않는다.
 *
 * <p>여기서 재현하는 것은 그 전달 구조다. 서버 두 대를 실제로 띄운 것이 아니라
 * 브로커를 두 개 만들어 각각을 한 대로 삼았다. 배포된 두 노드에서 다시 재는 것은
 * 아직 하지 않았다.
 */
class TwoServerBroadcastTest {

	private static GenericContainer<?> redis;
	private static RedisConnectionFactory connectionFactory;

	/** 서버 한 대를 흉내 낸다. 자기 브로커와 자기 구독 정보를 갖는다. */
	private static class Server {
		final ExecutorSubscribableChannel inbound = new ExecutorSubscribableChannel();
		final ExecutorSubscribableChannel outbound = new ExecutorSubscribableChannel();
		final ExecutorSubscribableChannel brokerChannel = new ExecutorSubscribableChannel();
		final SimpleBrokerMessageHandler broker;

		Server() {
			broker = new SimpleBrokerMessageHandler(inbound, outbound, brokerChannel, null);
			broker.start();
		}

		void subscribe(String sessionId, String destination, MessageHandler handler) {
			outbound.subscribe(handler);

			// 실제 클라이언트는 구독 전에 연결한다. 브로커는 연결된 세션에만 전달한다.
			SimpMessageHeaderAccessor connect =
				SimpMessageHeaderAccessor.create(SimpMessageType.CONNECT);
			connect.setSessionId(sessionId);
			inbound.send(MessageBuilder.createMessage(new byte[0], connect.getMessageHeaders()));

			SimpMessageHeaderAccessor accessor =
				SimpMessageHeaderAccessor.create(SimpMessageType.SUBSCRIBE);
			accessor.setSessionId(sessionId);
			accessor.setSubscriptionId("sub-1");
			accessor.setDestination(destination);
			inbound.send(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()));
		}

		/**
		 * 서버가 밖으로 내보내는 경로. SimpMessagingTemplate.convertAndSend가
		 * 실제로 쓰는 채널이 브로커 채널이다.
		 */
		void send(String destination, String payload) {
			SimpMessageHeaderAccessor accessor =
				SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
			accessor.setDestination(destination);
			accessor.setLeaveMutable(true);
			brokerChannel.send(
				MessageBuilder.createMessage(payload.getBytes(), accessor.getMessageHeaders()));
		}
	}


	/**
	 * 브로커는 CONNECT에 대한 응답도 같은 outbound 채널로 보낸다.
	 * 그것까지 세면 전달된 것으로 잘못 읽히므로 목적지가 맞는 MESSAGE만 센다.
	 */
	private static MessageHandler countOnly(String destination, CountDownLatch latch) {
		return message -> {
			SimpMessageHeaderAccessor accessor =
				SimpMessageHeaderAccessor.wrap(message);
			if (SimpMessageType.MESSAGE.equals(accessor.getMessageType())
				&& destination.equals(accessor.getDestination())) {
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
	}

	@AfterAll
	static void stopRedis() {
		if (redis != null) {
			redis.stop();
		}
	}

	@Test
	@DisplayName("타이핑과 읽음은 로컬 브로커로만 나가 다른 서버의 구독자에게 닿지 않는다")
	void localBrokerDoesNotCrossServers() throws Exception {
		Server serverA = new Server();
		Server serverB = new Server();

		CountDownLatch deliveredOnB = new CountDownLatch(1);
		serverB.subscribe("session-b", "/topic/chat/1/typing",
			countOnly("/topic/chat/1/typing", deliveredOnB));

		// 서버 A에 붙은 사용자가 타이핑을 시작했다. ChatWebSocketHandler가 하는 것과 같은 호출이다.
		serverA.send("/topic/chat/1/typing", "typing");

		assertThat(deliveredOnB.await(1, TimeUnit.SECONDS))
			.as("서버 B에 붙은 상대는 서버 A의 타이핑을 받지 못한다")
			.isFalse();
	}

	@Test
	@DisplayName("같은 서버 안에서는 로컬 브로커로도 전달된다")
	void localBrokerDeliversWithinTheSameServer() throws Exception {
		Server server = new Server();

		CountDownLatch delivered = new CountDownLatch(1);
		server.subscribe("session-a", "/topic/chat/1/typing",
			countOnly("/topic/chat/1/typing", delivered));

		server.send("/topic/chat/1/typing", "typing");

		assertThat(delivered.await(2, TimeUnit.SECONDS))
			.as("한 대 안에서는 닿는다. 그래서 개발 중에는 드러나지 않았다")
			.isTrue();
	}

	@Test
	@DisplayName("메시지 본문은 Redis Pub/Sub을 타므로 다른 서버까지 건너간다")
	void redisPubSubCrossesServers() throws Exception {
		String channel = "chat:room:1";
		CountDownLatch receivedOnB = new CountDownLatch(1);
		AtomicReference<String> payloadOnB = new AtomicReference<>();

		RedisMessageListenerContainer serverBListener = new RedisMessageListenerContainer();
		serverBListener.setConnectionFactory(connectionFactory);
		serverBListener.addMessageListener((message, pattern) -> {
			payloadOnB.set(new String(message.getBody()));
			receivedOnB.countDown();
		}, new ChannelTopic(channel));
		serverBListener.afterPropertiesSet();
		serverBListener.start();

		try {
			// 서버 A가 발행한다
			new StringRedisTemplate(connectionFactory).convertAndSend(channel, "안녕하세요");

			assertThat(receivedOnB.await(5, TimeUnit.SECONDS))
				.as("메시지 본문만 이 경로를 탄다")
				.isTrue();
			assertThat(payloadOnB.get()).contains("안녕하세요");
		} finally {
			serverBListener.stop();
			serverBListener.destroy();
		}
	}
}
