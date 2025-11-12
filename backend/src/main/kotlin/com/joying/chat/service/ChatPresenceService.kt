package com.joying.chat.service

import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * 채팅 온라인 상태 관리 Service
 *
 * Redis를 사용하여 사용자의 온라인 상태 추적
 *
 * 온라인 상태 설정 시점:
 * 1. WebSocket 연결 시 즉시 (WebSocketEventListener)
 * 2. Heartbeat 전송 시 (30초마다 TTL 갱신)
 *
 * 오프라인 상태 설정 시점:
 * 1. WebSocket 해제 시 즉시 (WebSocketEventListener)
 * 2. 5분간 heartbeat 없으면 자동 (Redis TTL 만료)
 */
@Service
class ChatPresenceService(
    private val redisTemplate: RedisTemplate<String, String>
) {

    companion object {
        private const val PRESENCE_KEY_PREFIX = "chat:presence:"
        private const val LAST_SEEN_KEY_PREFIX = "chat:last_seen:"
        private const val ACTIVE_ROOM_KEY_PREFIX = "chat:active_room:"  // 사용자가 현재 보고 있는 채팅방
        private const val ONLINE_TIMEOUT_SECONDS = 300L // 5분
        private const val ACTIVE_ROOM_TIMEOUT_SECONDS = 60L // 1분 (더 짧게 설정)
    }

    /**
     * 사용자 온라인 상태 설정
     *
     * @param memberId 회원 ID
     */
    fun setOnline(memberId: Long) {
        val key = "$PRESENCE_KEY_PREFIX$memberId"
        redisTemplate.opsForValue().set(key, "online", ONLINE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
    }

    /**
     * 사용자 오프라인 상태 설정
     *
     * @param memberId 회원 ID
     */
    fun setOffline(memberId: Long) {
        val presenceKey = "$PRESENCE_KEY_PREFIX$memberId"
        val lastSeenKey = "$LAST_SEEN_KEY_PREFIX$memberId"

        // 온라인 상태 제거
        redisTemplate.delete(presenceKey)

        // 마지막 접속 시간 저장 (7일간 보관)
        redisTemplate.opsForValue().set(
            lastSeenKey,
            Instant.now().toString(),
            7,
            TimeUnit.DAYS
        )
    }

    /**
     * 사용자 온라인 여부 확인
     *
     * @param memberId 회원 ID
     * @return 온라인 여부
     */
    fun isOnline(memberId: Long): Boolean {
        val key = "$PRESENCE_KEY_PREFIX$memberId"
        return redisTemplate.hasKey(key) == true
    }

    /**
     * 마지막 접속 시간 조회
     *
     * @param memberId 회원 ID
     * @return 마지막 접속 시간 (null이면 기록 없음)
     */
    fun getLastSeenAt(memberId: Long): Instant? {
        val key = "$LAST_SEEN_KEY_PREFIX$memberId"
        val lastSeen = redisTemplate.opsForValue().get(key) ?: return null

        return try {
            Instant.parse(lastSeen)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Heartbeat (온라인 상태 갱신)
     *
     * WebSocket 연결 중 주기적으로 호출하여 온라인 상태 유지
     *
     * @param memberId 회원 ID
     */
    fun heartbeat(memberId: Long) {
        setOnline(memberId)
    }

    /**
     * 사용자가 특정 채팅방에 입장 (화면을 보고 있음)
     *
     * @param memberId 회원 ID
     * @param chatRoomId 채팅방 ID
     */
    fun enterChatRoom(memberId: Long, chatRoomId: Long) {
        val key = "$ACTIVE_ROOM_KEY_PREFIX$memberId"
        redisTemplate.opsForValue().set(key, chatRoomId.toString(), ACTIVE_ROOM_TIMEOUT_SECONDS, TimeUnit.SECONDS)
    }

    /**
     * 사용자가 채팅방에서 퇴장 (화면을 나감)
     *
     * @param memberId 회원 ID
     */
    fun leaveChatRoom(memberId: Long) {
        val key = "$ACTIVE_ROOM_KEY_PREFIX$memberId"
        redisTemplate.delete(key)
    }

    /**
     * 사용자가 특정 채팅방을 보고 있는지 확인
     *
     * @param memberId 회원 ID
     * @param chatRoomId 채팅방 ID
     * @return 해당 채팅방을 보고 있으면 true
     */
    fun isViewingChatRoom(memberId: Long, chatRoomId: Long): Boolean {
        val key = "$ACTIVE_ROOM_KEY_PREFIX$memberId"
        val activeChatRoomId = redisTemplate.opsForValue().get(key) ?: return false
        return activeChatRoomId == chatRoomId.toString()
    }

    /**
     * 채팅방 활성 상태 갱신 (Heartbeat용)
     *
     * 사용자가 채팅방 화면에 있으면 주기적으로 호출하여 TTL 갱신
     *
     * @param memberId 회원 ID
     * @param chatRoomId 채팅방 ID
     */
    fun refreshChatRoomActivity(memberId: Long, chatRoomId: Long) {
        enterChatRoom(memberId, chatRoomId)
    }
}
