package com.joying.chat.websocket;

import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 회원당 송신 속도 제한 (#118).
 *
 * <p>수신이 느린 쪽은 세션별 버퍼가 격리하지만, 보내는 쪽이 몰리면 저장(같은 DB) ·
 * 발행(같은 Redis) · 전달(공유 풀)을 지나며 다른 방을 민다(실측 10.5배,
 * docs/performance/slow-consumer.md). 그 제어는 들어오는 쪽에서 해야 하고, 자리는
 * 방 직렬 큐에 넣기 전이다. 큐에 들어간 뒤에는 이미 자원을 먹는다.
 *
 * <p>거절이지 지연이 아니다. 인바운드 처리를 늦추면 그 스레드가 다른 세션의
 * 메시지까지 묶는다. 느린 소비자 문제의 인바운드판이 된다.
 *
 * <p>사람의 1:1 타이핑은 초당 1~2건이 상한에 가깝다. 기본값(초당 5건, 버스트 10)에
 * 사람은 걸리지 않는다. 0 이면 끈다.
 */
@Component
public class ChatSendRateLimiter {

	private final double ratePerSecond;
	private final double burst;

	// 회원 수만큼 자란다. 버킷 하나가 수십 바이트라 수십만 회원까지는 맵 하나로
	// 충분하고, 그 너머는 TTL 있는 저장소로 옮길 일이다 (남은 위험으로 기록)
	private final ConcurrentHashMap<Long, Bucket> buckets = new ConcurrentHashMap<>();

	public ChatSendRateLimiter(
		@Value("${joying.chat.inbound.rate-per-second:5}") double ratePerSecond,
		@Value("${joying.chat.inbound.burst:10}") double burst) {
		this.ratePerSecond = ratePerSecond;
		this.burst = burst;
	}

	public boolean enabled() {
		return ratePerSecond > 0;
	}

	/**
	 * 토큰이 있으면 하나를 쓰고 참을 돌려준다. 없으면 거짓이고, 그 송신은 거절이다.
	 */
	public boolean tryAcquire(Long memberId) {
		if (!enabled()) {
			return true;
		}
		Bucket bucket = buckets.computeIfAbsent(memberId, id -> new Bucket(burst));
		synchronized (bucket) {
			long now = System.nanoTime();
			double refilled = (now - bucket.lastRefillNanos) / 1_000_000_000.0 * ratePerSecond;
			bucket.tokens = Math.min(burst, bucket.tokens + refilled);
			bucket.lastRefillNanos = now;
			if (bucket.tokens >= 1.0) {
				bucket.tokens -= 1.0;
				return true;
			}
			return false;
		}
	}

	private static final class Bucket {
		double tokens;
		long lastRefillNanos;

		Bucket(double initialTokens) {
			this.tokens = initialTokens;
			this.lastRefillNanos = System.nanoTime();
		}
	}
}
