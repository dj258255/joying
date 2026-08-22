package com.joying.chat.config;

import org.springframework.core.task.TaskExecutor;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHandlingRunnable;

/**
 * 들어오는 프레임을 연결 단위로 한 줄로 세운다.
 *
 * <p>기본 채널은 스레드 풀이라 한 연결에서 연달아 보낸 프레임이 서로 앞지른다.
 * 나중에 보낸 것이 먼저 번호를 받아, 보낸 사람 화면에서도 자기 말의 앞뒤가 바뀐다.
 *
 * <p>Spring 이 넘겨주는 것은 연결을 모르는 평범한 {@link Runnable} 이다. 다만 그
 * 안에 처리할 메시지가 들어 있고, 메시지 헤더에 연결 식별자가 있다. 그것을 꺼내
 * 줄을 고른다.
 *
 * <p>꺼내지 못하면 0번 줄로 보낸다. 연결과 무관한 내부 메시지이므로 순서를 지킬
 * 대상이 아니고, 버리는 것보다 아무 줄에나 세우는 편이 안전하다.
 *
 * <p>{@link TaskExecutor} 로 만든 이유는 Spring 이 이 자리에서 나온 실행기를 그
 * 타입으로 다시 주입받기 때문이다. 그냥 {@link Runnable} 만 받는 실행기로 두면
 * 기동할 때 주입에 실패한다.
 */
public class SessionOrderedExecutor implements TaskExecutor {

	private final KeyOrderedExecutor delegate;

	public SessionOrderedExecutor(KeyOrderedExecutor delegate) {
		this.delegate = delegate;
	}

	@Override
	public void execute(Runnable task) {
		delegate.execute(sessionIdOf(task), task);
	}

	private static String sessionIdOf(Runnable task) {
		if (!(task instanceof MessageHandlingRunnable handling)) {
			return null;
		}
		Message<?> message = handling.getMessage();
		if (message == null) {
			return null;
		}
		return StompHeaderAccessor.wrap(message).getSessionId();
	}

	public void shutdown() {
		delegate.shutdown();
	}
}
