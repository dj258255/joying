package com.joying.chat.service

import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.util.concurrent.TimeUnit

/**
 * 안읽은 메시지 개수 관리 Service (Redis 캐싱)
 *
 * 전략:
 * - Redis: 캐시 (빠른 조회, 확장성)
 * - MongoDB: Source of Truth (정확성)
 * - 캐시 미스 시 MongoDB에서 계산 후 Redis에 저장
 */
@Service
class UnreadCountService(
    private val redis: RedisTemplate<String, String>,
    private val chatMessageRepository: ChatMessageRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository
) {
    private val logger = LoggerFactory.getLogger(UnreadCountService::class.java)

    companion object {
        private const val UNREAD_KEY_PREFIX = "unread:"
        private const val TTL_DAYS = 7L
    }

    /**
     * Redis Key 생성
     */
    private fun getKey(chatRoomId: Long, memberId: Long): String {
        return "${UNREAD_KEY_PREFIX}${chatRoomId}:${memberId}"
    }

    /**
     * 안읽은 개수 증가 (메시지 전송 시)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID (안읽은 개수를 증가시킬 대상, 즉 수신자)
     */
    fun increment(chatRoomId: Long, memberId: Long) {
        try {
            val key = getKey(chatRoomId, memberId)
            redis.opsForValue().increment(key)
            redis.expire(key, TTL_DAYS, TimeUnit.DAYS)

            logger.debug("Redis 안읽은 개수 증가: chatRoomId={}, memberId={}", chatRoomId, memberId)
        } catch (e: Exception) {
            logger.error("Redis increment 실패 (MongoDB에는 저장됨, 재접속 시 복구 가능): ${e.message}")
        }
    }

    /**
     * 안읽은 개수 초기화 (읽음 처리 시)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    fun reset(chatRoomId: Long, memberId: Long) {
        try {
            val key = getKey(chatRoomId, memberId)
            redis.delete(key)

            logger.debug("Redis 안읽은 개수 초기화: chatRoomId={}, memberId={}", chatRoomId, memberId)
        } catch (e: Exception) {
            logger.error("Redis reset 실패: ${e.message}")
        }
    }

    /**
     * 안읽은 개수 조회 (단일 채팅방)
     *
     * Redis 우선, 캐시 미스 시 MongoDB에서 계산
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @return 안읽은 메시지 개수
     */
    suspend fun get(chatRoomId: Long, memberId: Long): Long {
        val key = getKey(chatRoomId, memberId)

        // 1. Redis 조회 (캐시 히트)
        val cached = redis.opsForValue().get(key)
        if (cached != null) {
            logger.debug("Redis 캐시 히트: chatRoomId={}, memberId={}, count={}", chatRoomId, memberId, cached)
            return cached.toLong()
        }

        // 2. 캐시 미스 → MongoDB에서 계산 후 Redis에 저장
        logger.debug("Redis 캐시 미스: chatRoomId={}, memberId={} → MongoDB 조회", chatRoomId, memberId)
        return warmup(chatRoomId, memberId)
    }

    /**
     * 안읽은 개수 배치 조회 (여러 채팅방)
     *
     * 채팅방 목록 조회 시 사용
     * Redis Pipeline으로 한 번에 조회 후, 캐시 미스는 MongoDB에서 병렬 계산
     *
     * @param chatRoomIds 채팅방 ID 목록
     * @param memberId 회원 ID
     * @return 채팅방별 안읽은 개수 (chatRoomId -> count)
     */
    suspend fun getBatch(
        chatRoomIds: List<Long>,
        memberId: Long
    ): Map<Long, Long> {
        if (chatRoomIds.isEmpty()) {
            return emptyMap()
        }

        val keys = chatRoomIds.map { getKey(it, memberId) }

        // Redis Pipeline으로 한 방에 조회
        val cached = try {
            redis.opsForValue().multiGet(keys) ?: emptyList()
        } catch (e: Exception) {
            logger.error("Redis multiGet 실패: ${e.message}")
            emptyList()
        }

        val result = mutableMapOf<Long, Long>()
        val missedIds = mutableListOf<Long>()

        chatRoomIds.forEachIndexed { index, chatRoomId ->
            val count = cached.getOrNull(index)?.toLongOrNull()
            if (count != null) {
                result[chatRoomId] = count  // 캐시 히트
            } else {
                missedIds.add(chatRoomId)  // 캐시 미스
            }
        }

        logger.debug(
            "Redis 배치 조회: 총 {}개, 캐시 히트 {}개, 캐시 미스 {}개",
            chatRoomIds.size,
            result.size,
            missedIds.size
        )

        // 캐시 미스 → MongoDB에서 병렬 계산
        if (missedIds.isNotEmpty()) {
            coroutineScope {
                missedIds.map { chatRoomId ->
                    async {
                        chatRoomId to warmup(chatRoomId, memberId)
                    }
                }.forEach { deferred ->
                    val (chatRoomId, count) = deferred.await()
                    result[chatRoomId] = count
                }
            }
        }

        return result
    }

    /**
     * Cache Warming (MongoDB → Redis 동기화)
     *
     * MongoDB에서 실제 안읽은 개수를 계산하고 Redis에 저장
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @return 안읽은 메시지 개수
     */
    private suspend fun warmup(chatRoomId: Long, memberId: Long): Long {
        val member = withContext(Dispatchers.IO) {
            chatRoomMemberRepository
                .findByChatRoomIdAndMemberId(chatRoomId, memberId)
                .orElse(null)
        }

        // 채팅방 멤버가 없으면 0
        if (member == null) {
            logger.warn("채팅방 멤버 없음: chatRoomId={}, memberId={}", chatRoomId, memberId)
            return 0L
        }

        // MongoDB에서 실제 안읽은 개수 계산
        val actualCount = if (member.lastReadAt != null) {
            withContext(Dispatchers.IO) {
                chatMessageRepository.countByChatRoomIdAndCreatedAtAfter(
                    chatRoomId,
                    member.lastReadAt!!
                )
            }
        } else {
            0L
        }

        // Redis에 캐싱 (7일 TTL)
        try {
            val key = getKey(chatRoomId, memberId)
            redis.opsForValue().set(key, actualCount.toString(), TTL_DAYS, TimeUnit.DAYS)

            logger.info(
                "Cache warming 완료: chatRoomId={}, memberId={}, count={}",
                chatRoomId,
                memberId,
                actualCount
            )
        } catch (e: Exception) {
            logger.error("Redis 캐싱 실패: ${e.message}")
        }

        return actualCount
    }
}