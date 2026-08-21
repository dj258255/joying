package com.joying.chat.service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomStatus;
import com.joying.chat.repository.ChatRoomMemberRepository;
import com.joying.chat.repository.ChatRoomRepository;

import lombok.RequiredArgsConstructor;

/**
 * 채팅방에 들어갈 수 있는지를 Redis에 캐싱한다.
 *
 * <p>세 가지를 본다. 방의 구매자이거나 판매자인가, 아직 나가지 않았는가, 방이 열려
 * 있는가.
 *
 * <p>예전에는 첫째만 봤다. 그래서 나가기에서 캐시를 지워도 다음 조회가 같은 근거로
 * 다시 허용을 계산해 캐싱했다. 무효화가 결과를 바꿀 수 없다는 뜻이었고, 나간 사람이
 * 히스토리를 계속 읽을 수 있었다.
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
	private final ChatRoomMemberRepository chatRoomMemberRepository;

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

		boolean isParticipant = memberId.equals(chatRoom.getBuyer().getMemberId())
			|| memberId.equals(chatRoom.getSeller().getMemberId());
		if (!isParticipant) {
			return false;
		}

		// 닫힌 방은 누구에게도 열지 않는다
		if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE) {
			return false;
		}

		// 나갔으면 다시 들어오기 전까지 막는다. 기록이 없어도 막는다.
		return chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
			.map(member -> !member.isLeft())
			.orElse(false);
	}

	/**
	 * 방을 만들 때 양쪽 권한을 미리 넣어 둔다. 첫 메시지에서 조회가 나가지 않는다.
	 *
	 * <p>막 만든 방이라 둘 다 남아 있고 열려 있다. 그래서 여기서는 다시 확인하지 않는다.
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
