package com.joying.chat.service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.joying.chat.domain.ChatRoom;
import com.joying.chat.repository.ChatRoomRepository;

import lombok.RequiredArgsConstructor;

/**
 * 채팅방에 들어갈 수 있는지를 Redis에 캐싱한다.
 *
 * <p>판정 근거는 이 사람이 방의 구매자이거나 판매자인가 하나뿐이다. 방을 나갔는지
 * ({@code isLeft})도, 방이 닫혔는지({@code status})도 보지 않는다. 그래서 나가기에서
 * 캐시를 지워도 다음 조회가 같은 근거로 다시 허용을 계산해 캐싱한다. 무효화가 결과를
 * 바꿀 수 없다는 뜻이다.
 *
 * <p>나간 사람을 실제로 막는 것은 이 캐시가 아니라 메시지 전송 경로의 별도 조회다.
 * 이것은 이관 중에 고치지 않는다. 지금 동작은 테스트로 박아 두었다.
 */
@Service
@RequiredArgsConstructor
public class ChatRoomPermissionCache {

	private static final Logger log = LoggerFactory.getLogger(ChatRoomPermissionCache.class);

	private static final String PERMISSION_KEY_PREFIX = "chatroom:permission:";
	private static final long TTL_HOURS = 1L;
	private static final String ALLOWED = "ALLOWED";
	private static final String DENIED = "DENIED";

	private final RedisTemplate<String, String> redis;
	private final ChatRoomRepository chatRoomRepository;

	private String getKey(Long chatRoomId, Long memberId) {
		return PERMISSION_KEY_PREFIX + chatRoomId + ":" + memberId;
	}

	public boolean hasPermission(Long chatRoomId, Long memberId) {
		String key = getKey(chatRoomId, memberId);

		String cached = redis.opsForValue().get(key);
		if (cached != null) {
			return ALLOWED.equals(cached);
		}

		boolean allowed = checkPermissionFromDB(chatRoomId, memberId);
		redis.opsForValue().set(key, allowed ? ALLOWED : DENIED, TTL_HOURS, TimeUnit.HOURS);

		log.info("권한 캐싱 완료: chatRoomId={}, memberId={}, allowed={}",
			chatRoomId, memberId, allowed);
		return allowed;
	}

	private boolean checkPermissionFromDB(Long chatRoomId, Long memberId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId).orElse(null);
		if (chatRoom == null) {
			return false;
		}
		return memberId.equals(chatRoom.getBuyer().getMemberId())
			|| memberId.equals(chatRoom.getSeller().getMemberId());
	}

	/**
	 * 방을 만들 때 양쪽 권한을 미리 넣어 둔다. 첫 메시지에서 조회가 나가지 않는다.
	 */
	public void warmupPermissions(Long chatRoomId) {
		ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId).orElse(null);
		if (chatRoom == null) {
			return;
		}

		Long buyerId = chatRoom.getBuyer().getMemberId();
		Long sellerId = chatRoom.getSeller().getMemberId();

		Map<String, String> cacheData = Map.of(
			getKey(chatRoomId, buyerId), ALLOWED,
			getKey(chatRoomId, sellerId), ALLOWED);

		redis.opsForValue().multiSet(cacheData);
		cacheData.keySet().forEach(key -> redis.expire(key, TTL_HOURS, TimeUnit.HOURS));

		log.info("채팅방 권한 미리 채움: chatRoomId={}, buyerId={}, sellerId={}",
			chatRoomId, buyerId, sellerId);
	}

	public void invalidate(Long chatRoomId, Long memberId) {
		redis.delete(getKey(chatRoomId, memberId));
		log.info("권한 캐시 무효화: chatRoomId={}, memberId={}", chatRoomId, memberId);
	}

	/**
	 * 방 전체의 권한 캐시를 지운다.
	 *
	 * <p>{@code keys}는 Redis를 통째로 훑는 명령이라 키가 많으면 그동안 다른 요청이
	 * 막힌다. 지금은 부르는 곳이 없다.
	 */
	public void invalidateAll(Long chatRoomId) {
		Set<String> keys = redis.keys(PERMISSION_KEY_PREFIX + chatRoomId + ":*");
		if (keys != null && !keys.isEmpty()) {
			redis.delete(keys);
			log.info("채팅방 전체 권한 캐시 무효화: chatRoomId={}, count={}", chatRoomId, keys.size());
		}
	}
}
