package com.joying.wallet.domain;

import java.time.Instant;

import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 원장 한 줄.
 *
 * <p>이체 한 건은 원장 두 줄을 남긴다. 나간 지갑에 한 줄, 들어온 지갑에 한 줄이다.
 * 잔액은 지갑 행에도 들고 있지만 그것은 지금 값일 뿐이고, 어쩌다 그 값이 됐는지는
 * 이 원장에만 남는다. 둘이 어긋나면 원장이 맞다.
 *
 * <p>{@code balanceAfter}는 그 줄이 적힌 직후의 잔액이다. 나중에 잔액이 이상할 때
 * 어느 줄부터 어긋났는지 짚을 수 있게 같이 적는다.
 */
@Entity
@Getter
@Table(
	name = "wallet_entry",
	indexes = @Index(name = "idx_wallet_entry_wallet", columnList = "wallet_id, entry_id")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WalletEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "entry_id")
	private Long entryId;

	@Comment("어느 지갑의 줄인가")
	@Column(name = "wallet_id", nullable = false)
	private Long walletId;

	@Comment("어느 이체에서 나온 줄인가")
	@Column(name = "transfer_id", nullable = false)
	private Long transferId;

	@Comment("들어왔는지 빠졌는지")
	@Enumerated(EnumType.STRING)
	@Column(name = "direction", nullable = false, length = 8)
	private EntryDirection direction;

	@Comment("금액. 언제나 양수이며 방향은 direction이 정한다")
	@Column(name = "amount", nullable = false)
	private Long amount;

	@Comment("이 줄이 적힌 직후의 잔액")
	@Column(name = "balance_after", nullable = false)
	private Long balanceAfter;

	@CreationTimestamp
	@Column(name = "created_at", updatable = false)
	private Instant createdAt;

	public static WalletEntry of(Long walletId, Long transferId, EntryDirection direction,
								 long amount, long balanceAfter) {
		WalletEntry entry = new WalletEntry();
		entry.walletId = walletId;
		entry.transferId = transferId;
		entry.direction = direction;
		entry.amount = amount;
		entry.balanceAfter = balanceAfter;
		return entry;
	}
}
