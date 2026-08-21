package com.joying.chat.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * 방 안에서 메시지에 붙일 번호를 발급한다.
 *
 * <p>Redis의 증가 연산 하나로 정한다. 여러 서버가 동시에 불러도 같은 번호가 두 번
 * 나가지 않는다. 읽고 더해서 쓰는 방식이면 그 사이에 낀 요청이 같은 값을 받는다.
 *
 * <p>번호에 빈 자리가 생길 수 있다. 번호를 받은 뒤 저장이 실패하면 그 번호는 쓰이지
 * 않는다. 순서를 정하는 것이 목적이지 몇 건인지 세는 것이 아니므로 빈 자리는 괜찮다.
 */
@Component
@RequiredArgsConstructor
public class MessageSequenceGenerator {

	private static final Logger log = LoggerFactory.getLogger(MessageSequenceGenerator.class);

	private static final String SEQUENCE_KEY_PREFIX = "chat:sequence:";

	/**
	 * 지금 값이 주어진 값보다 작을 때만 올린다.
	 *
	 * <p>읽고 비교해서 쓰는 것을 세 번의 호출로 나누면 그 사이에 낀 발급이 지워진다.
	 * 이미 나간 번호를 다시 내주게 되므로, 지금 고치고 있는 것과 같은 결함이 된다.
	 * Redis가 스크립트 하나를 통째로 돌리는 것을 이용해 한 번에 끝낸다.
	 */
	private static final RedisScript<Long> RAISE_TO = new DefaultRedisScript<>("""
		local current = tonumber(redis.call('GET', KEYS[1]) or '0')
		local floor = tonumber(ARGV[1])
		if current < floor then
		  redis.call('SET', KEYS[1], ARGV[1])
		  return 1
		end
		return 0
		""", Long.class);

	private final RedisTemplate<String, String> redis;

	/**
	 * 다음 번호를 준다.
	 *
	 * <p>Redis가 죽으면 번호를 받을 수 없다. 그때는 저장을 막는다. 번호 없이 저장하면
	 * 그 메시지만 순서를 정할 근거가 없어 화면에서 자리를 못 잡는다.
	 */
	public long next(Long chatRoomId) {
		Long sequence = redis.opsForValue().increment(SEQUENCE_KEY_PREFIX + chatRoomId);
		if (sequence == null) {
			throw new IllegalStateException("메시지 번호를 받지 못했습니다: chatRoomId=" + chatRoomId);
		}
		return sequence;
	}

	/**
	 * 이미 쌓인 방을 이어 받는다.
	 *
	 * <p>번호를 도입하기 전에 저장된 메시지에 번호를 채우고 나면, 다음 번호가 그보다
	 * 커야 새 메시지가 뒤로 붙는다.
	 *
	 * <p>{@code setIfAbsent}로 걸지 않는 이유는 값이 이미 있을 수 있어서다. 채우기가
	 * 도는 사이에 새 메시지가 들어와 값이 생겼다면 그것을 덮어써서는 안 되고, 채운
	 * 번호보다 작다면 올려야 한다. 그래서 지금 값을 보고 작을 때만 올린다.
	 */
	public void seedAtLeast(Long chatRoomId, long floor) {
		String key = SEQUENCE_KEY_PREFIX + chatRoomId;
		Long raised = redis.execute(RAISE_TO, List.of(key), String.valueOf(floor));
		if (raised != null && raised == 1L) {
			log.info("메시지 번호 시작값 설정: chatRoomId={}, from={}", chatRoomId, floor);
		}
	}
}
