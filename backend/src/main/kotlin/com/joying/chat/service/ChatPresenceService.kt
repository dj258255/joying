package com.joying.chat.service

import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * 채팅 온라인 상태 관리 Service
 *
 * Redis를 사용하여 사용자의 온라인 상태 추적
 * - WebSocket 연결 시 온라인 상태 설정
 * - 일정 시간 heartbeat 없으면 오프라인 처리
 */
@Service
class ChatPresenceService(
    private val redisTemplate: RedisTemplate<String, String>
) {

    companion object {
        private const val PRESENCE_KEY_PREFIX = "chat:presence:"
        private const val LAST_SEEN_KEY_PREFIX = "chat:last_seen:"
        private const val ONLINE_TIMEOUT_SECONDS = 300L // 5분
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
}
