package com.joying.wallet.domain;

import java.time.Instant;

import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 돈이 한 번 움직인 기록.
 *
 * <p>{@code reference}에 유니크 제약이 걸려 있다. 같은 참조로 이체를 두 번 부르면
 * 두 번째 삽입이 DB에서 막히고, 부르는 쪽은 그것을 보고 이미 처리된 건임을 안다.
 * 멱등을 애플리케이션 조회로 확인하면 두 요청이 동시에 들어왔을 때 둘 다 없다고
 * 읽고 둘 다 넣는다. 그래서 판정을 DB 제약에 맡겼다.
 *
 * <p>지갑이 비어 있는 쪽은 시스템 밖을 뜻한다. 보내는 지갑이 없으면 밖에서 들어온
 * 것이고, 받는 지갑이 없으면 밖으로 나간 것이다.
 */
@Entity
@Getter
@Table(
	name = "wallet_transfer",
	uniqueConstraints = @UniqueConstraint(name = "uk_wallet_transfer_reference", columnNames = "reference")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WalletTransfer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "transfer_id")
	private Long transferId;

	@Comment("이 이체를 가리키는 값. 두 번 생기지 않아야 한다")
	@Column(name = "reference", nullable = false, length = 128)
	private String reference;

	@Comment("보내는 지갑. 비어 있으면 시스템 밖에서 들어온 것이다")
	@Column(name = "from_wallet_id")
	private Long fromWalletId;

	@Comment("받는 지갑. 비어 있으면 시스템 밖으로 나간 것이다")
	@Column(name = "to_wallet_id")
	private Long toWalletId;

	@Comment("옮긴 금액")
	@Column(name = "amount", nullable = false)
	private Long amount;

	@Comment("무엇 때문에 옮겼는지")
	@Column(name = "description", length = 255)
	private String description;

	@CreationTimestamp
	@Column(name = "created_at", updatable = false)
	private Instant createdAt;

	public static WalletTransfer of(Long fromWalletId, Long toWalletId, long amount,
									String reference, String description) {
		WalletTransfer transfer = new WalletTransfer();
		transfer.fromWalletId = fromWalletId;
		transfer.toWalletId = toWalletId;
		transfer.amount = amount;
		transfer.reference = reference;
		transfer.description = description;
		return transfer;
	}
}
