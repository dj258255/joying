package com.joying.chat.service;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.joying.chat.metrics.ChatMetrics;

/**
 * 방 단위로 번호 발급과 발행을 한 줄로 세운다.
 *
 * <p>번호 발급(Redis 증가)과 발행(Redis 채널)은 별개의 호출이다. 1번 노드가 41번을
 * 발급하고 발행하기 전에, 2번 노드가 42번을 발급하고 먼저 발행할 수 있다. 같은 노드
 * 안에서는 방 단위 실행기가 줄을 세우지만 노드 사이에는 아무 줄이 없다. 지금은 앞단의
 * 방 해시 라우팅이 두 사람을 같은 노드에 묶어 이 틈을 피하고 있다.
 *
 * <p>이 중재자는 그 틈을 라우팅 없이 막는 다른 선택지다. 발급부터 발행까지를 방 단위
 * Redis 잠금으로 감싸면, 발급 순서와 발행 순서가 같아진다. Redis 는 한 채널의 발행
 * 순서를 모든 구독자에게 그대로 보존하므로, 발행 순서만 잡으면 수신 순서가 따라온다.
 *
 * <p>공짜가 아니다. 저장이 임계 구역 안에 있어 잠금 보유 시간이 DB 쓰기만큼 길고,
 * 같은 방의 전송은 노드를 건너서도 서로 기다린다. 그 대기가 얼마인지가 이 방식의
 * 값이고, 지표로 남겨 측정과 운영에서 본다.
 *
 * <p>기본값은 꺼짐(node)이다. joying.chat.ordering.mode=arbiter 로 켠다.
 */
@Component
public class RoomOrderArbiter {

	private static final Logger log = LoggerFactory.getLogger(RoomOrderArbiter.class);

	private static final String LOCK_KEY_PREFIX = "chat:order-lock:";

	/**
	 * 내가 잡은 잠금일 때만 지운다.
	 *
	 * <p>GET 과 DEL 을 따로 부르면 그 사이에 잠금이 만료되고 다른 노드가 잡았을 때
	 * 남의 잠금을 지우게 된다. 스크립트 하나로 비교와 삭제를 한 번에 끝낸다.
	 */
	private static final RedisScript<Long> UNLOCK_IF_MINE = new DefaultRedisScript<>("""
		if redis.call('GET', KEYS[1]) == ARGV[1] then
		  return redis.call('DEL', KEYS[1])
		end
		return 0
		""", Long.class);

	private final RedisTemplate<String, String> redis;
	private final ChatMetrics chatMetrics;
	private final String mode;
	private final long holdMillis;
	private final long waitMillis;

	public RoomOrderArbiter(RedisTemplate<String, String> redis,
							ChatMetrics chatMetrics,
							@Value("${joying.chat.ordering.mode:node}") String mode,
							@Value("${joying.chat.ordering.lock-hold-ms:2000}") long holdMillis,
							@Value("${joying.chat.ordering.lock-wait-ms:3000}") long waitMillis) {
		this.redis = redis;
		this.chatMetrics = chatMetrics;
		this.mode = mode;
		this.holdMillis = holdMillis;
		this.waitMillis = waitMillis;
		if (arbiterMode()) {
			log.info("순서 중재 모드로 뜬다: 잠금 보유 상한 {}ms, 획득 대기 상한 {}ms",
				holdMillis, waitMillis);
		}
	}

	public boolean arbiterMode() {
		return "arbiter".equals(mode);
	}

	/**
	 * 중재 모드면 방 잠금 안에서, 아니면 그대로 실행한다.
	 *
	 * <p>잠금을 제때 못 잡으면 메시지를 버리지 않고 잠금 없이 보낸다. 전송이 막히는
	 * 것보다 그 한 건의 순서가 흔들리는 쪽을 고른 것이다. 다만 조용히 지나가면 안
	 * 되므로 건수를 센다. 이 수가 0이 아니면 "뒤집힘 0" 은 그 실행에서 보장이 아니다.
	 *
	 * <p>잠금 보유 상한(PX)도 같은 종류의 창이다. 임계 구역이 상한보다 오래 걸리면
	 * 잠금이 먼저 풀려 다른 전송이 끼어들 수 있다. 이 창의 존재 자체가 이 방식의
	 * 대가이고, 없앨 수는 없고 셀 수만 있다.
	 */
	public <T> T inRoomOrder(Long chatRoomId, Supplier<T> action) {
		if (!arbiterMode()) {
			return action.get();
		}

		String key = LOCK_KEY_PREFIX + chatRoomId;
		String token = UUID.randomUUID().toString();
		long waitedNanos = acquire(key, token);

		if (waitedNanos < 0) {
			chatMetrics.orderLockTimeout();
			log.warn("순서 잠금을 {}ms 안에 못 잡았다. 잠금 없이 보낸다: chatRoomId={}",
				waitMillis, chatRoomId);
			return action.get();
		}

		chatMetrics.recordOrderLockWait(waitedNanos);
		try {
			return action.get();
		} finally {
			redis.execute(UNLOCK_IF_MINE, List.of(key), token);
		}
	}

	/**
	 * 잡을 때까지 짧게 쉬며 다시 묻는다. 기다린 시간(나노초)을 돌려주고, 상한을
	 * 넘기면 음수를 돌려준다.
	 *
	 * <p>1:1 채팅이라 한 방의 경쟁자는 많아야 둘이다. 구독이나 알림 없이 되묻는
	 * 것으로 충분하고, 되묻는 간격이 곧 대기 지연의 하한이 된다.
	 */
	private long acquire(String key, String token) {
		long started = System.nanoTime();
		long deadline = started + waitMillis * 1_000_000L;
		while (true) {
			Boolean acquired = redis.opsForValue().setIfAbsent(
				key, token, java.time.Duration.ofMillis(holdMillis));
			if (Boolean.TRUE.equals(acquired)) {
				return System.nanoTime() - started;
			}
			if (System.nanoTime() > deadline) {
				return -1L;
			}
			try {
				Thread.sleep(3);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				return -1L;
			}
		}
	}
}
