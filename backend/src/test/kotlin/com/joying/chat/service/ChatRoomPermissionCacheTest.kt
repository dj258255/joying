package com.joying.chat.service

import com.joying.chat.domain.ChatRoom
import com.joying.chat.repository.ChatRoomRepository
import com.joying.member.domain.Member
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.ValueOperations
import java.util.Optional
import java.util.concurrent.TimeUnit

/**
 * 채팅방 권한 캐시의 현재 동작을 고정한다.
 *
 * 실사에서 결함이 나온 자리라 특히 조심해서 박아 둔다. 캐시가 무엇을 근거로
 * 판정하는지, 무엇을 보지 않는지를 테스트가 그대로 드러내게 썼다.
 */
class ChatRoomPermissionCacheTest {

    private lateinit var redis: RedisTemplate<String, String>
    private lateinit var valueOps: ValueOperations<String, String>
    private lateinit var chatRoomRepository: ChatRoomRepository
    private lateinit var cache: ChatRoomPermissionCache

    private val roomId = 1L
    private val buyerId = 100L
    private val sellerId = 200L
    private val strangerId = 999L

    @BeforeEach
    fun setUp() {
        redis = mock()
        valueOps = mock()
        chatRoomRepository = mock()
        whenever(redis.opsForValue()).thenReturn(valueOps)
        cache = ChatRoomPermissionCache(redis, chatRoomRepository)
    }

    private fun key(memberId: Long) = "chatroom:permission:$roomId:$memberId"

    private fun roomWith(buyer: Long, seller: Long): ChatRoom {
        val buyerMember = mock<Member>()
        val sellerMember = mock<Member>()
        whenever(buyerMember.getMemberId()).thenReturn(buyer)
        whenever(sellerMember.getMemberId()).thenReturn(seller)

        val room = mock<ChatRoom>()
        whenever(room.buyer).thenReturn(buyerMember)
        whenever(room.seller).thenReturn(sellerMember)
        return room
    }

    @Test
    @DisplayName("캐시에 ALLOWED가 있으면 저장소를 보지 않는다")
    fun cacheHitSkipsDatabase() = runBlocking<Unit> {
        whenever(valueOps.get(key(buyerId))).thenReturn("ALLOWED")

        assertThat(cache.hasPermission(roomId, buyerId)).isTrue()
        verify(chatRoomRepository, never()).findById(any())
    }

    @Test
    @DisplayName("캐시에 DENIED가 있으면 거절이다")
    fun cachedDenialIsHonored() = runBlocking<Unit> {
        whenever(valueOps.get(key(strangerId))).thenReturn("DENIED")

        assertThat(cache.hasPermission(roomId, strangerId)).isFalse()
        verify(chatRoomRepository, never()).findById(any())
    }

    @Test
    @DisplayName("캐시가 비었으면 저장소를 보고 결과를 캐싱한다")
    fun cacheMissChecksDatabaseAndCaches() = runBlocking<Unit> {
        val room = roomWith(buyerId, sellerId)
        whenever(valueOps.get(key(buyerId))).thenReturn(null)
        whenever(chatRoomRepository.findById(roomId)).thenReturn(Optional.of(room))

        assertThat(cache.hasPermission(roomId, buyerId)).isTrue()
        verify(valueOps).set(eq(key(buyerId)), eq("ALLOWED"), any(), eq(TimeUnit.HOURS))
    }

    @Test
    @DisplayName("방에 없는 사람은 거절이고 그것도 캐싱한다")
    fun strangerIsDeniedAndCached() = runBlocking<Unit> {
        val room = roomWith(buyerId, sellerId)
        whenever(valueOps.get(key(strangerId))).thenReturn(null)
        whenever(chatRoomRepository.findById(roomId)).thenReturn(Optional.of(room))

        assertThat(cache.hasPermission(roomId, strangerId)).isFalse()
        verify(valueOps).set(eq(key(strangerId)), eq("DENIED"), any(), eq(TimeUnit.HOURS))
    }

    @Test
    @DisplayName("방이 없으면 거절이다")
    fun missingRoomIsDenied() = runBlocking<Unit> {
        whenever(valueOps.get(key(buyerId))).thenReturn(null)
        whenever(chatRoomRepository.findById(roomId)).thenReturn(Optional.empty())

        assertThat(cache.hasPermission(roomId, buyerId)).isFalse()
    }

    @Test
    @DisplayName("알려진 결함: 판정 근거가 buyer/seller뿐이라 방을 나갔는지는 보지 않는다")
    fun knownDefect_ignoresWhetherMemberLeft() = runBlocking<Unit> {
        // 판정은 chatRoom의 buyer/seller와 같은 사람인가만 본다. ChatRoomMember의
        // isLeft도, 방의 status도 보지 않는다.
        //
        // 그래서 나가기에서 캐시를 지워도 다음 조회가 같은 근거로 다시 ALLOWED를
        // 계산해 캐싱한다. 무효화가 결과를 바꿀 수 없다는 뜻이다.
        //
        // 나간 사람을 실제로 막는 것은 이 캐시가 아니라 메시지 전송 경로의 별도
        // 조회다. 조회 경로에는 그 검사가 없어 히스토리가 열려 있다.
        //
        // 이관 중에 고치지 않는다. 지금 동작을 박아 두고 이관이 끝난 뒤 뒤집는다.
        val room = roomWith(buyerId, sellerId)
        whenever(valueOps.get(key(buyerId))).thenReturn(null)
        whenever(chatRoomRepository.findById(roomId)).thenReturn(Optional.of(room))

        assertThat(cache.hasPermission(roomId, buyerId))
            .`as`("나갔더라도 buyer이면 통과한다")
            .isTrue()
    }
}
