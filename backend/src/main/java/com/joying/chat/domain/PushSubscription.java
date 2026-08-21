package com.joying.chat.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 브라우저 푸시 알림 구독 정보.
 *
 * <p>엔드포인트에 유니크를 걸어 두어 같은 브라우저가 두 번 등록되지 않는다.
 */
@Getter
@Entity
@Table(
	name = "push_subscriptions",
	indexes = {
		@Index(name = "idx_push_subscription_member_id", columnList = "member_id"),
		@Index(name = "idx_push_subscription_endpoint", columnList = "endpoint", unique = true)
	})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PushSubscription {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "member_id", nullable = false)
	@Setter
	private Long memberId;

	/** 브라우저의 푸시 서비스로 알림을 보낼 주소 */
	@Column(name = "endpoint", nullable = false, length = 500)
	private String endpoint;

	/** 메시지를 암호화하는 데 쓰는 공개키 */
	@Column(name = "p256dh", nullable = false, length = 500)
	@Setter
	private String p256dh;

	/** 메시지를 인증하는 데 쓰는 비밀값 */
	@Column(name = "auth", nullable = false, length = 500)
	@Setter
	private String auth;

	/** 어느 브라우저에서 등록했는지 */
	@Column(name = "user_agent", length = 500)
	@Setter
	private String userAgent;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	public PushSubscription(Long memberId, String endpoint, String p256dh, String auth,
							String userAgent) {
		this.memberId = memberId;
		this.endpoint = endpoint;
		this.p256dh = p256dh;
		this.auth = auth;
		this.userAgent = userAgent;
		this.createdAt = Instant.now();
		this.updatedAt = Instant.now();
	}

	@PreUpdate
	public void preUpdate() {
		this.updatedAt = Instant.now();
	}
}
