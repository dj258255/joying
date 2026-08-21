package com.joying.chat.service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.joying.chat.broadcast.ChatBroadcaster;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.domain.ChatRoomMember;
import com.joying.chat.dto.PresenceUpdateEvent;
import com.joying.chat.repository.ChatRoomMemberRepository;

import lombok.RequiredArgsConstructor;

/**
 * 누가 지금 붙어 있는지.
 *
 * <p>상태를 Redis에 두는 이유는 서버가 여러 대일 때 다른 서버도 같은 답을 해야 하기
 * 때문이다. 만료를 걸어 두어 끊긴 것을 못 받아도 시간이 지나면 스스로 사라진다.
 */
@Service
@RequiredArgsConstructor
public class ChatPresenceService {

	private static final Logger log = LoggerFactory.getLogger(ChatPresenceService.class);

	private static final String PRESENCE_KEY_PREFIX = "chat:presence:";
	private static final String LAST_SEEN_KEY_PREFIX = "chat:last_seen:";

	/** 지금 보고 있는 방 */
	private static final String ACTIVE_ROOM_KEY_PREFIX = "chat:active_room:";

	private static final long ONLINE_TIMEOUT_SECONDS = 300L;

	/** 보고 있는 방은 더 짧게 잡는다. 화면을 떠난 것을 오래 붙들고 있으면 안 된다 */
	private static final long ACTIVE_ROOM_TIMEOUT_SECONDS = 60L;

	private final RedisTemplate<String, String> redisTemplate;
	private final ChatBroadcaster chatBroadcaster;
	private final ChatRoomMemberRepository chatRoomMemberRepository;

	public void setOnline(Long memberId) {
		String key = PRESENCE_KEY_PREFIX + memberId;
		boolean wasOnline = Boolean.TRUE.equals(redisTemplate.hasKey(key));

		redisTemplate.opsForValue().set(key, "online", ONLINE_TIMEOUT_SECONDS, TimeUnit.SECONDS);

		// 이미 온라인이었으면 알릴 것이 없다. 살아 있다는 신호가 주기적으로 오므로
		// 매번 알리면 같은 내용이 계속 나간다.
		if (!wasOnline) {
			broadcastPresenceUpdate(memberId, true, null);
		}
	}

	public void setOffline(Long memberId) {
		redisTemplate.delete(PRESENCE_KEY_PREFIX + memberId);

		Instant now = Instant.now();
		redisTemplate.opsForValue().set(
			LAST_SEEN_KEY_PREFIX + memberId, now.toString(), 7, TimeUnit.DAYS);

		broadcastPresenceUpdate(memberId, false, now);
	}

	public boolean isOnline(Long memberId) {
		return Boolean.TRUE.equals(redisTemplate.hasKey(PRESENCE_KEY_PREFIX + memberId));
	}

	public Instant getLastSeenAt(Long memberId) {
		String lastSeen = redisTemplate.opsForValue().get(LAST_SEEN_KEY_PREFIX + memberId);
		if (lastSeen == null) {
			return null;
		}
		try {
			return Instant.parse(lastSeen);
		} catch (Exception e) {
			return null;
		}
	}

	/**
	 * 살아 있다는 신호. 만료가 걸려 있으므로 주기적으로 다시 알려야 한다.
	 */
	public void heartbeat(Long memberId) {
		setOnline(memberId);
	}

	public void enterChatRoom(Long memberId, Long chatRoomId) {
		redisTemplate.opsForValue().set(ACTIVE_ROOM_KEY_PREFIX + memberId,
			String.valueOf(chatRoomId), ACTIVE_ROOM_TIMEOUT_SECONDS, TimeUnit.SECONDS);
	}

	public void leaveChatRoom(Long memberId) {
		redisTemplate.delete(ACTIVE_ROOM_KEY_PREFIX + memberId);
	}

	/**
	 * 이 사람이 지금 이 방을 보고 있는지.
	 *
	 * <p>보고 있으면 푸시를 보내지 않는다. 화면에 이미 떠 있는 것을 알림으로 또 알릴
	 * 이유가 없다.
	 */
	public boolean isViewingChatRoom(Long memberId, Long chatRoomId) {
		String activeChatRoomId = redisTemplate.opsForValue().get(ACTIVE_ROOM_KEY_PREFIX + memberId);
		return String.valueOf(chatRoomId).equals(activeChatRoomId);
	}

	public void refreshChatRoomActivity(Long memberId, Long chatRoomId) {
		enterChatRoom(memberId, chatRoomId);
	}

	/**
	 * 이 사람과 대화 중인 상대들에게 상태가 바뀐 것을 알린다.
	 *
	 * <p>참여 중인 방을 전부 훑으므로 방이 많으면 그만큼 조회가 나간다. 연결과 해제
	 * 때마다 돈다는 점도 같이 봐야 한다.
	 */
	private void broadcastPresenceUpdate(Long memberId, boolean isOnline, Instant lastSeenAt) {
		try {
			List<ChatRoomMember> chatRoomMembers = chatRoomMemberRepository.findByMemberId(memberId);

			for (ChatRoomMember chatRoomMember : chatRoomMembers) {
				ChatRoom chatRoom = chatRoomMember.getChatRoom();

				Long otherMemberId = memberId.equals(chatRoom.getBuyer().getMemberId())
					? chatRoom.getSeller().getMemberId()
					: chatRoom.getBuyer().getMemberId();

				if (otherMemberId == null) {
					continue;
				}

				PresenceUpdateEvent event = PresenceUpdateEvent.builder()
					.memberId(memberId)
					.isOnline(isOnline)
					.lastSeenAt(lastSeenAt)
					.build();

				chatBroadcaster.toUser(otherMemberId, "/queue/presence-update", event);
			}
		} catch (Exception e) {
			// 상태를 못 알려도 대화 자체는 된다. 여기서 터뜨려 연결 처리를 막지 않는다.
			log.warn("온라인 상태 알림 실패: memberId={}, error={}", memberId, e.getMessage());
		}
	}
}
