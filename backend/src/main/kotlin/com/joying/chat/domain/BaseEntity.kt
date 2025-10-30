package com.joying.chat.domain

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant

/**
 * Kotlin 엔티티용 Base Entity (UTC 기준 시간 저장)
 *
 * Java BaseEntity와 동일한 구조이지만 Kotlin 호환성을 위해 별도로 생성
 * - Kotlin의 data class에서 접근 가능하도록 var로 선언
 * - Auditing 기능으로 createdAt, updatedAt 자동 관리
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseEntity {

    @CreatedDate
    @Column(name = "created_at", updatable = false, nullable = false)
    var createdAt: Instant? = null

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
}