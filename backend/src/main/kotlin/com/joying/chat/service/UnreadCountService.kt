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
        logger.info("[getBatch] 시작: chatRoomIds={}, memberId={}", chatRoomIds, memberId)

        if (chatRoomIds.isEmpty()) {
            logger.info("[getBatch] chatRoomIds가 비어있음 → emptyMap 반환")
            return emptyMap()
        }

        val keys = chatRoomIds.map { getKey(it, memberId) }
        logger.info("[getBatch] Redis keys 생성 완료: keys={}", keys)

        // Redis Pipeline으로 한 방에 조회
        logger.info("[getBatch] Redis multiGet 시작...")
        val cached = try {
            val result = redis.opsForValue().multiGet(keys) ?: emptyList()
            logger.info("[getBatch] Redis multiGet 성공: result={}", result)
            result
        } catch (e: Exception) {
            logger.error("[getBatch] Redis multiGet 실패: ${e.message}", e)
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
        logger.info("[warmup] 시작: chatRoomId={}, memberId={}", chatRoomId, memberId)

        try {
            val member = withContext(Dispatchers.IO) {
                chatRoomMemberRepository
                    .findByChatRoomIdAndMemberId(chatRoomId, memberId)
                    .orElse(null)
            }

            logger.info("[warmup] chatRoomMember 조회 완료: chatRoomId={}, member exists={}", chatRoomId, member != null)

            // 채팅방 멤버가 없으면 0
            if (member == null) {
                logger.warn("채팅방 멤버 없음: chatRoomId={}, memberId={}", chatRoomId, memberId)
                return 0L
            }

            // MongoDB에서 실제 안읽은 개수 계산
            logger.info("[warmup] MongoDB 카운트 쿼리 시작: chatRoomId={}, lastReadAt={}", chatRoomId, member.lastReadAt)
            val actualCount = if (member.lastReadAt != null) {
                withContext(Dispatchers.IO) {
                    chatMessageRepository.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfter(
                        chatRoomId,
                        member.lastReadAt!!
                    )
                }
            } else {
                logger.info("[warmup] lastReadAt이 null이므로 0 반환")
                0L
            }

            logger.info("[warmup] MongoDB 카운트 쿼리 완료: chatRoomId={}, count={}", chatRoomId, actualCount)

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
        } catch (e: Exception) {
            logger.error("[warmup] 실패 - chatRoomId={}, memberId={}, error={}", chatRoomId, memberId, e.message, e)
            // MongoDB 조회 실패 시 기본값 0 반환 (서비스 중단 방지)
            return 0L
        }
    }
}