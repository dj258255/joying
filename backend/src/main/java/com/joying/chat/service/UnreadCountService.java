package com.joying.chat.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.repository.ChatMessageRepository;
import com.joying.chat.repository.ChatRoomMemberRepository;

/**
 * 안읽은 메시지 개수.
 *
 * <p>Redis를 먼저 보고, 없으면 저장소에서 세어 다시 넣는다. 메시지가 올 때마다 세면
 * 방 목록을 열 때마다 방 수만큼 집계 쿼리가 나간다.
 *
 * <p>Redis가 죽어도 메시지 저장을 되돌리지 않는다. 배지가 잠깐 틀린 것과 메시지가
 * 사라지는 것 중 뒤엣것이 훨씬 비싸다.
 */
@Service
public class UnreadCountService {

	private static final Logger log = LoggerFactory.getLogger(UnreadCountService.class);

	private static final String UNREAD_KEY_PREFIX = "unread:";
	private static final long TTL_DAYS = 7L;

	private final RedisTemplate<String, String> redis;
	private final ChatMessageRepository chatMessageRepository;
	private final ChatRoomMemberRepository chatRoomMemberRepository;
	private final Executor queryExecutor;

	public UnreadCountService(RedisTemplate<String, String> redis,
							  ChatMessageRepository chatMessageRepository,
							  ChatRoomMemberRepository chatRoomMemberRepository,
							  @Qualifier("chatQueryExecutor") Executor queryExecutor) {
		this.redis = redis;
		this.chatMessageRepository = chatMessageRepository;
		this.chatRoomMemberRepository = chatRoomMemberRepository;
		this.queryExecutor = queryExecutor;
	}

	private String getKey(Long chatRoomId, Long memberId) {
		return UNREAD_KEY_PREFIX + chatRoomId + ":" + memberId;
	}

	/**
	 * 메시지를 받은 쪽의 개수를 올린다.
	 */
	public void increment(Long chatRoomId, Long memberId) {
		try {
			String key = getKey(chatRoomId, memberId);
			redis.opsForValue().increment(key);
			redis.expire(key, TTL_DAYS, TimeUnit.DAYS);
		} catch (Exception e) {
			// 저장은 이미 끝났다. 여기서 터뜨려 그것까지 되돌리지 않는다.
			log.error("Redis increment 실패: {}", e.getMessage());
		}
	}

	/**
	 * 읽었으므로 0으로 되돌린다.
	 */
	public void reset(Long chatRoomId, Long memberId) {
		try {
			redis.delete(getKey(chatRoomId, memberId));
		} catch (Exception e) {
			log.error("Redis reset 실패: {}", e.getMessage());
		}
	}

	public long get(Long chatRoomId, Long memberId) {
		String cached = redis.opsForValue().get(getKey(chatRoomId, memberId));
		if (cached != null) {
			return Long.parseLong(cached);
		}
		return warmup(chatRoomId, memberId);
	}

	/**
	 * 여러 방을 한 번에 본다.
	 *
	 * <p>Redis는 한 번에 묶어 묻고, 없는 것만 저장소에서 센다. 방마다 저장소를 봐야
	 * 하므로 순차로 하면 방 수만큼 지연이 더해진다. 서로 의존하지 않으니 동시에 날린다.
	 */
	public Map<Long, Long> getBatch(List<Long> chatRoomIds, Long memberId) {
		if (chatRoomIds.isEmpty()) {
			return Map.of();
		}

		List<String> keys = chatRoomIds.stream().map(id -> getKey(id, memberId)).toList();

		List<String> cached;
		try {
			List<String> result = redis.opsForValue().multiGet(keys);
			cached = result == null ? List.of() : result;
		} catch (Exception e) {
			log.error("Redis multiGet 실패: {}", e.getMessage());
			cached = List.of();
		}

		Map<Long, Long> result = new HashMap<>();
		List<Long> missedIds = new ArrayList<>();

		for (int i = 0; i < chatRoomIds.size(); i++) {
			Long chatRoomId = chatRoomIds.get(i);
			Long count = i < cached.size() ? parseOrNull(cached.get(i)) : null;
			if (count != null) {
				result.put(chatRoomId, count);
			} else {
				missedIds.add(chatRoomId);
			}
		}

		log.debug("Redis 배치 조회: 총 {}개, 캐시 히트 {}개, 캐시 미스 {}개",
			chatRoomIds.size(), result.size(), missedIds.size());

		if (!missedIds.isEmpty()) {
			List<CompletableFuture<Map.Entry<Long, Long>>> futures = missedIds.stream()
				.map(chatRoomId -> CompletableFuture.supplyAsync(
					() -> Map.entry(chatRoomId, warmup(chatRoomId, memberId)), queryExecutor))
				.toList();

			CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
			futures.forEach(future -> {
				Map.Entry<Long, Long> entry = future.join();
				result.put(entry.getKey(), entry.getValue());
			});
		}

		return result;
	}

	private Long parseOrNull(String value) {
		if (value == null) {
			return null;
		}
		try {
			return Long.valueOf(value);
		} catch (NumberFormatException e) {
			return null;
		}
	}

	/**
	 * 저장소에서 세어 Redis에 다시 넣는다.
	 *
	 * <p>읽은 시각이 없다는 것은 한 번도 안 읽었다는 뜻이지 읽을 것이 없다는 뜻이
	 * 아니다. 그때는 방의 처음부터 전부 센다. 예전에는 여기서 0을 돌려줬고, 그래서
	 * 새로 만든 방에 상대가 먼저 말을 걸면 배지에 아무것도 안 떴다.
	 */
	private long warmup(Long chatRoomId, Long memberId) {
		try {
			ChatRoomMember member = chatRoomMemberRepository
				.findByChatRoomIdAndMemberId(chatRoomId, memberId)
				.orElse(null);

			if (member == null) {
				log.warn("채팅방 멤버 없음: chatRoomId={}, memberId={}", chatRoomId, memberId);
				return 0L;
			}

			// 본인이 보낸 것은 어느 쪽이든 빼고 센다
			long actualCount = member.getLastReadAt() == null
				? chatMessageRepository
					.countByChatRoomIdAndIsDeletedFalseAndSenderIdNot(chatRoomId, memberId)
				: chatMessageRepository
					.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(
						chatRoomId, member.getLastReadAt(), memberId);

			try {
				redis.opsForValue().set(getKey(chatRoomId, memberId),
					String.valueOf(actualCount), TTL_DAYS, TimeUnit.DAYS);
			} catch (Exception e) {
				log.error("Redis 캐싱 실패: {}", e.getMessage());
			}

			return actualCount;
		} catch (Exception e) {
			// 세는 데 실패해도 방 목록은 떠야 한다. 배지만 0으로 보인다.
			log.error("안읽음 집계 실패: chatRoomId={}, memberId={}, error={}",
				chatRoomId, memberId, e.getMessage(), e);
			return 0L;
		}
	}
}
