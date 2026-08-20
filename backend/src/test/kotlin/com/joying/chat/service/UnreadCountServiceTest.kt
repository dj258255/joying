package com.joying.chat.service

import com.joying.chat.domain.ChatRoomMember
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.ValueOperations
import java.time.Instant
import java.util.Optional
import java.util.concurrent.TimeUnit

/**
 * 안읽음 개수의 현재 동작을 고정한다.
 *
 * 여기서 검증하는 것은 "올바른 동작"이 아니라 "지금 동작"이다. 실사에서 나온 결함이
 * 이미 몇 개 있지만 그것을 여기서 고치지 않는다. 고치면 무엇이 원래 동작이었는지
 * 알 수 없게 되고, 이관이 끝난 뒤 무엇이 깨졌는지 가릴 수도 없어진다.
 *
 * 알고 있는 결함은 테스트 이름과 주석에 그대로 적어 둔다.
 */
class UnreadCountServiceTest {

    private lateinit var redis: RedisTemplate<String, String>
    private lateinit var valueOps: ValueOperations<String, String>
    private lateinit var messageRepository: ChatMessageRepository
    private lateinit var memberRepository: ChatRoomMemberRepository
    private lateinit var service: UnreadCountService

    private val roomId = 1L
    private val memberId = 100L
    private val key = "unread:1:100"

    @BeforeEach
    fun setUp() {
        redis = mock()
        valueOps = mock()
        messageRepository = mock()
        memberRepository = mock()
        whenever(redis.opsForValue()).thenReturn(valueOps)
        // 코루틴을 걷어내면서 병렬 조회가 CompletableFuture로 바뀌었다.
        // 테스트에서는 같은 스레드에서 바로 실행해 순서를 예측 가능하게 둔다.
        service = UnreadCountService(redis, messageRepository, memberRepository) { it.run() }
    }

    @Test
    @DisplayName("증가하면 값을 올리고 만료를 다시 건다")
    fun incrementRaisesAndRefreshesTtl() {
        service.increment(roomId, memberId)

        verify(valueOps).increment(key)
        verify(redis).expire(eq(key), any(), eq(TimeUnit.DAYS))
    }

    @Test
    @DisplayName("Redis가 죽어도 증가는 예외를 던지지 않는다. 메시지 저장을 되돌리지 않기 위해서다")
    fun incrementSwallowsRedisFailure() {
        whenever(valueOps.increment(key)).doThrow(RuntimeException("Redis 연결 실패"))

        service.increment(roomId, memberId)
        // 예외가 올라오지 않는다
    }

    @Test
    @DisplayName("초기화하면 키를 지운다")
    fun resetDeletesKey() {
        service.reset(roomId, memberId)

        verify(redis).delete(key)
    }

    @Test
    @DisplayName("캐시에 값이 있으면 그 값을 그대로 돌려주고 저장소를 보지 않는다")
    fun returnsCachedValueWithoutTouchingStores() {
        whenever(valueOps.get(key)).thenReturn("7")

        val count = service.get(roomId, memberId)

        assertThat(count).isEqualTo(7L)
        verify(memberRepository, never()).findByChatRoomIdAndMemberId(any(), any())
    }

    @Test
    @DisplayName("캐시가 비었고 방 멤버가 아니면 0이다")
    fun returnsZeroWhenNotAMember() {
        whenever(valueOps.get(key)).thenReturn(null)
        whenever(memberRepository.findByChatRoomIdAndMemberId(roomId, memberId))
            .thenReturn(Optional.empty())

        assertThat(service.get(roomId, memberId)).isZero()
    }

    @Test
    @DisplayName("캐시가 비었으면 저장소에서 세되 본인이 보낸 것은 빼고 센다")
    fun countsOnlyMessagesFromOthers() {
        val lastReadAt = Instant.parse("2026-01-01T00:00:00Z")
        val member = mock<ChatRoomMember>()
        whenever(member.lastReadAt).thenReturn(lastReadAt)

        whenever(valueOps.get(key)).thenReturn(null)
        whenever(memberRepository.findByChatRoomIdAndMemberId(roomId, memberId))
            .thenReturn(Optional.of(member))
        whenever(
            messageRepository.countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(
                roomId, lastReadAt, memberId
            )
        ).thenReturn(3L)

        assertThat(service.get(roomId, memberId)).isEqualTo(3L)
    }

    @Test
    @DisplayName("알려진 결함: 방을 한 번도 안 열었으면 쌓인 메시지가 있어도 0으로 본다")
    fun knownDefect_zeroWhenNeverOpened() {
        // lastReadAt이 null이면 저장소를 보지 않고 0을 돌려준다. 방을 한 번도 안 연
        // 사람은 메시지가 아무리 쌓여도 배지가 0으로 보인다.
        //
        // 이관 중에 고치지 않는다. 지금 동작을 그대로 박아 두고, 이관이 끝난 뒤에
        // 이 테스트를 뒤집으면서 고친다.
        val member = mock<ChatRoomMember>()
        whenever(member.lastReadAt).thenReturn(null)

        whenever(valueOps.get(key)).thenReturn(null)
        whenever(memberRepository.findByChatRoomIdAndMemberId(roomId, memberId))
            .thenReturn(Optional.of(member))

        assertThat(service.get(roomId, memberId)).isZero()
        verify(messageRepository, never())
            .countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot(any(), any(), any())
    }
}
