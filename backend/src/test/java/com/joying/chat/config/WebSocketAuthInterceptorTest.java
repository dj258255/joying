package com.joying.chat.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ExecutorSubscribableChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.joying.chat.service.ChatRoomPermissionCache;
import com.joying.common.config.security.JwtTokenProvider;

/**
 * 웹소켓 인증이 스레드에 남는지, 구독이 인가를 받는지 잰다.
 *
 * <p>인바운드 채널은 스레드 풀이다. 인증을 심고 비우지 않으면 그 스레드가 다음
 * 메시지를 처리할 때 남의 인증을 본다. 눈으로는 안 보이고 부하가 있어야 드러난다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WebSocketAuthInterceptorTest {

	@Mock
	JwtTokenProvider jwtTokenProvider;

	@Mock
	ChatRoomPermissionCache permissionCache;

	WebSocketAuthInterceptor interceptor;
	MessageChannel channel;

	@BeforeEach
	void setUp() {
		channel = new ExecutorSubscribableChannel();
		interceptor = new WebSocketAuthInterceptor(jwtTokenProvider, permissionCache);

		given(jwtTokenProvider.validateToken(anyString())).willReturn(true);
		given(permissionCache.hasPermission(anyLong(), anyLong())).willReturn(true);

		// 토큰에서 회원 번호를 뽑는 규칙을 한 번만 걸어 둔다. 여러 스레드에서 각자
		// 스터빙하면 Mockito가 깨진다.
		given(jwtTokenProvider.getMemberId(anyString())).willAnswer(invocation -> {
			String token = invocation.getArgument(0);
			return Long.valueOf(token.substring("token-".length()));
		});
	}

	@AfterEach
	void clear() {
		SecurityContextHolder.clearContext();
	}

	private Message<byte[]> connectAs(long memberId) {
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
		accessor.setNativeHeader("cookie", "access_token=token-" + memberId);
		return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
	}

	private Message<byte[]> subscribeTo(String destination) {
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
		accessor.setSessionId("session-1");
		accessor.setSubscriptionId("sub-1");
		accessor.setDestination(destination);
		return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
	}

	@Test
	@DisplayName("연결이 끝나면 인증이 스레드에 남지 않는다")
	void doesNotLeakAuthenticationToThread() {
		Message<byte[]> connect = connectAs(100L);

		interceptor.preSend(connect, channel);
		// 처리가 끝난 것을 알린다. 실제 채널이 매 메시지마다 부르는 자리다.
		interceptor.afterSendCompletion(connect, channel, true, null);

		assertThat(SecurityContextHolder.getContext().getAuthentication())
			.as("비우지 않으면 이 스레드를 다시 쓰는 다음 메시지가 남의 인증을 본다")
			.isNull();
	}

	@Test
	@DisplayName("연결이 아닌 메시지는 앞사람의 인증을 보지 않는다")
	void noCrossTalkAcrossPooledThreads() throws Exception {
		// 누수는 연결할 때 드러나지 않는다. 연결은 매번 자기 인증을 새로 심기 때문이다.
		// 드러나는 자리는 연결이 아닌 메시지다. 그것은 인증을 심지 않으므로, 그 스레드에
		// 남아 있던 앞사람의 인증을 그대로 본다.
		int rounds = 50;
		// 스레드 하나로 묶어야 재사용이 확실히 일어난다
		ExecutorService pool = Executors.newFixedThreadPool(1);

		List<Callable<Long>> tasks = IntStream.range(0, rounds)
			.<Callable<Long>>mapToObj(i -> () -> {
				long memberId = 1000L + i;

				// 앞사람이 연결한다
				Message<byte[]> connect = connectAs(memberId);
				interceptor.preSend(connect, channel);
				interceptor.afterSendCompletion(connect, channel, true, null);

				// 뒷사람이 같은 스레드로 연결이 아닌 메시지를 보낸다
				StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
				accessor.setDestination("/app/chat/1/send");
				Message<byte[]> send =
					MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
				interceptor.preSend(send, channel);

				Authentication leaked = SecurityContextHolder.getContext().getAuthentication();
				interceptor.afterSendCompletion(send, channel, true, null);

				// 앞사람의 인증이 보이면 1
				return leaked == null ? 0L : 1L;
			}).toList();

		List<Future<Long>> results = pool.invokeAll(tasks);
		pool.shutdown();
		pool.awaitTermination(30, TimeUnit.SECONDS);

		long leaked = 0;
		for (Future<Long> result : results) {
			leaked += result.get();
		}

		assertThat(leaked)
			.as("%d건 중 앞사람 인증이 보인 건수", rounds)
			.isZero();
	}

	@Test
	@DisplayName("들어갈 수 없는 방은 구독도 막는다")
	void blocksSubscriptionToForbiddenRoom() {
		given(permissionCache.hasPermission(7L, 100L)).willReturn(false);
		SecurityContextHolder.getContext().setAuthentication(
			new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
				"100", null, List.of()));

		Message<byte[]> subscribe = subscribeTo("/topic/chat/7/typing");

		assertThat(interceptor.preSend(subscribe, channel))
			.as("막지 않으면 남의 방에서 누가 타이핑하는지 관찰할 수 있다")
			.isNull();
	}

	@Test
	@DisplayName("들어갈 수 있는 방은 구독을 통과시킨다")
	void allowsSubscriptionToOwnRoom() {
		given(permissionCache.hasPermission(7L, 100L)).willReturn(true);
		SecurityContextHolder.getContext().setAuthentication(
			new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
				"100", null, List.of()));

		assertThat(interceptor.preSend(subscribeTo("/topic/chat/7/read"), channel)).isNotNull();
	}

	@Test
	@DisplayName("방과 상관없는 목적지는 그대로 통과시킨다")
	void allowsNonRoomDestinations() {
		SecurityContextHolder.getContext().setAuthentication(
			new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
				"100", null, List.of()));

		assertThat(interceptor.preSend(subscribeTo("/user/queue/notifications"), channel))
			.isNotNull();
	}
}
