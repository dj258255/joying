package com.joying.chat.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.metrics.ChatMetrics;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.service.MessageSequenceGenerator;

/**
 * 번호표가 사라진 방의 복구 (#100).
 *
 * <p>INCR 가 1을 돌려줬을 때 DB 에 더 큰 번호가 있으면 번호표가 축출 · 유실로 사라진
 * 것이다. 그대로 내주면 이미 나간 번호가 다시 나가고, 에러 없이 순서 판정만 흔들린다.
 */
class MessageSequenceGeneratorTest {

	private RedisTemplate<String, String> redis;
	private ValueOperations<String, String> values;
	private ChatMessageRepository repository;
	private ChatMetrics metrics;
	private MessageSequenceGenerator generator;

	@BeforeEach
	@SuppressWarnings("unchecked")
	void setUp() {
		redis = mock(RedisTemplate.class);
		values = mock(ValueOperations.class);
		when(redis.opsForValue()).thenReturn(values);
		repository = mock(ChatMessageRepository.class);
		metrics = mock(ChatMetrics.class);
		generator = new MessageSequenceGenerator(redis, repository, metrics);
	}

	@Test
	@DisplayName("평시 경로(2 이상)는 DB 를 보지 않고 그대로 내준다")
	void ordinaryPathSkipsDatabase() {
		when(values.increment("chat:sequence:1")).thenReturn(5L);

		assertThat(generator.next(1L)).isEqualTo(5L);
		verify(repository, never()).findTopSequence(any());
		verify(metrics, never()).sequenceRecovered();
	}

	@Test
	@DisplayName("정말 새 방이면 1을 그대로 내준다")
	void freshRoomKeepsOne() {
		when(values.increment("chat:sequence:2")).thenReturn(1L);
		when(repository.findTopSequence(2L)).thenReturn(null);

		assertThat(generator.next(2L)).isEqualTo(1L);
		verify(metrics, never()).sequenceRecovered();
	}

	@Test
	@DisplayName("번호표가 사라진 방이면 DB 최대값 위로 올려 다시 받는다")
	void lostKeyRecoversFromDatabaseMax() {
		ChatMessage top = ChatMessage.createTextMessage(3L, 10L, "m", null);
		top.setSequence(640L);
		when(values.increment("chat:sequence:3")).thenReturn(1L);
		when(repository.findTopSequence(3L)).thenReturn(top);
		when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(641L);

		assertThat(generator.next(3L)).isEqualTo(641L);
		verify(metrics).sequenceRecovered();
	}

	@Test
	@DisplayName("번호 없는 행만 있는 방이면 복구하지 않고 1을 내준다")
	void roomWithUnsequencedRowsKeepsOne() {
		ChatMessage top = ChatMessage.createTextMessage(4L, 10L, "m", null);
		when(values.increment("chat:sequence:4")).thenReturn(1L);
		when(repository.findTopSequence(4L)).thenReturn(top);

		assertThat(generator.next(4L)).isEqualTo(1L);
		verify(metrics, never()).sequenceRecovered();
	}
	@Test
	@DisplayName("복구 재발급이 DB 최대값 이하면 내주지 않고 막고, 키를 비워 복구가 다시 서게 한다")
	void recoveryHandingOutDuplicateIsBlocked() {
		ChatMessage top = ChatMessage.createTextMessage(5L, 10L, "m", null);
		top.setSequence(640L);
		when(values.increment("chat:sequence:5")).thenReturn(1L);
		when(repository.findTopSequence(5L)).thenReturn(top);
		when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(1L);

		org.assertj.core.api.Assertions.assertThatThrownBy(() -> generator.next(5L))
			.isInstanceOf(IllegalStateException.class);
		verify(redis).delete("chat:sequence:5");
		verify(metrics, never()).sequenceRecovered();
		verify(metrics).sequenceFailure();
	}
}
