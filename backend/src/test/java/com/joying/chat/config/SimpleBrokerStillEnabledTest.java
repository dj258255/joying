package com.joying.chat.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.ExecutorSubscribableChannel;

/**
 * "SimpleBroker 제거"라는 주석이 사실인지 확인한다.
 *
 * <p>WebSocketConfig에는 SimpleBroker를 제거하고 Redis Pub/Sub으로 대체했다고 적혀 있다.
 * 그런데 코드에는 {@code enableSimpleBroker}도 {@code enableStompBrokerRelay}도 없다.
 * 둘 다 없으면 Spring이 SimpleBroker를 자동으로 켠다. 즉 브로커는 그대로 살아 있고,
 * 바뀐 것은 목적지 접두사 제한이 사라진 것뿐이다.
 *
 * <p>이것이 중요한 이유는 타이핑, 읽음, 접속 상태, 안읽음 배지가 전부 그 브로커로
 * 나가기 때문이다. 그 목적지들은 Redis를 타지 않으므로 서버가 두 대가 되면
 * 다른 서버에 붙은 상대에게 닿지 않는다.
 */
class SimpleBrokerStillEnabledTest {

	private MessageBrokerRegistry registryWithNoBrokerConfigured() {
		SubscribableChannel inbound = new ExecutorSubscribableChannel();
		MessageChannel outbound = new ExecutorSubscribableChannel();
		return new MessageBrokerRegistry(inbound, outbound);
	}

	/**
	 * WebSocketConfig가 하는 것과 같은 설정. 브로커를 켜는 호출이 없다.
	 */
	private void configureLikeWebSocketConfig(MessageBrokerRegistry registry) {
		registry.setApplicationDestinationPrefixes("/app");
		registry.setUserDestinationPrefix("/user");
	}

	@Test
	@DisplayName("브로커를 켜는 호출이 없으면 Spring이 SimpleBroker를 자동으로 켠다")
	void simpleBrokerIsEnabledEvenThoughNothingEnablesIt() throws Exception {
		MessageBrokerRegistry registry = registryWithNoBrokerConfigured();
		configureLikeWebSocketConfig(registry);

		Method getSimpleBroker = MessageBrokerRegistry.class
			.getDeclaredMethod("getSimpleBroker", SubscribableChannel.class);
		getSimpleBroker.setAccessible(true);

		Object simpleBroker = getSimpleBroker.invoke(registry, new ExecutorSubscribableChannel());

		assertThat(simpleBroker)
			.as("enableSimpleBroker를 부르지 않았는데도 SimpleBroker가 만들어진다")
			.isNotNull();
	}

	@Test
	@DisplayName("자동으로 켜진 SimpleBroker는 목적지 접두사 제한이 없다")
	void autoEnabledBrokerHasNoDestinationPrefixes() throws Exception {
		MessageBrokerRegistry registry = registryWithNoBrokerConfigured();
		configureLikeWebSocketConfig(registry);

		Method getSimpleBroker = MessageBrokerRegistry.class
			.getDeclaredMethod("getSimpleBroker", SubscribableChannel.class);
		getSimpleBroker.setAccessible(true);
		Object broker = getSimpleBroker.invoke(registry, new ExecutorSubscribableChannel());

		Method getDestinationPrefixes = broker.getClass().getMethod("getDestinationPrefixes");
		Object prefixes = getDestinationPrefixes.invoke(broker);

		// 예전에는 enableSimpleBroker("/topic", "/queue")로 제한돼 있었다.
		// 그 호출을 지우면서 브로커가 꺼진 것이 아니라 제한만 사라졌다.
		assertThat((Iterable<?>) prefixes)
			.as("접두사 제한이 사라져 어떤 목적지든 이 브로커로 나간다")
			.isEmpty();
	}
}
