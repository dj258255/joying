package com.joying.chat.websocket;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 송신 속도 제한의 성질을 고정한다 (#118).
 *
 * <p>여기서 재는 것은 버킷의 산수다. 폭주가 실제로 다른 방을 못 밀게 되는지는
 * 부하로 잰다 (docs/performance/inbound-backpressure.md).
 */
class ChatSendRateLimiterTest {

	@Test
	@DisplayName("버스트만큼은 몰아 보내도 통과하고 그 다음부터 거절된다")
	void allowsBurstThenRejects() {
		ChatSendRateLimiter limiter = new ChatSendRateLimiter(5, 10);

		for (int i = 0; i < 10; i++) {
			assertThat(limiter.tryAcquire(1L)).as("버스트 %d번째", i + 1).isTrue();
		}
		assertThat(limiter.tryAcquire(1L)).as("버스트 소진 뒤").isFalse();
	}

	@Test
	@DisplayName("시간이 지나면 초당 속도만큼 다시 찬다")
	void refillsOverTime() throws InterruptedException {
		ChatSendRateLimiter limiter = new ChatSendRateLimiter(5, 10);
		for (int i = 0; i < 10; i++) {
			limiter.tryAcquire(1L);
		}
		assertThat(limiter.tryAcquire(1L)).isFalse();

		// 초당 5건이므로 400ms 면 2건이 찬다
		Thread.sleep(400);
		assertThat(limiter.tryAcquire(1L)).isTrue();
		assertThat(limiter.tryAcquire(1L)).isTrue();
		assertThat(limiter.tryAcquire(1L)).isFalse();
	}

	@Test
	@DisplayName("회원끼리는 버킷이 따로다. 한 명의 폭주가 남의 몫을 못 먹는다")
	void bucketsArePerMember() {
		ChatSendRateLimiter limiter = new ChatSendRateLimiter(5, 10);
		for (int i = 0; i < 20; i++) {
			limiter.tryAcquire(1L);
		}

		assertThat(limiter.tryAcquire(2L)).isTrue();
	}

	@Test
	@DisplayName("0이면 꺼진 것이고 전부 통과한다")
	void zeroRateDisables() {
		ChatSendRateLimiter limiter = new ChatSendRateLimiter(0, 10);
		for (int i = 0; i < 100; i++) {
			assertThat(limiter.tryAcquire(1L)).isTrue();
		}
		assertThat(limiter.enabled()).isFalse();
	}
}
