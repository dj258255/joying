package com.joying.chat.repository

import com.joying.chat.domain.PushSubscription
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface PushSubscriptionRepository : JpaRepository<PushSubscription, Long> {
    /**
     * 회원 ID로 모든 구독 정보 조회
     */
    fun findByMemberId(memberId: Long): List<PushSubscription>

    /**
     * 엔드포인트로 구독 정보 조회
     */
    fun findByEndpoint(endpoint: String): Optional<PushSubscription>

    /**
     * 엔드포인트로 구독 정보 삭제
     */
    fun deleteByEndpoint(endpoint: String)

    /**
     * 회원 ID로 모든 구독 정보 삭제
     */
    fun deleteByMemberId(memberId: Long)
}