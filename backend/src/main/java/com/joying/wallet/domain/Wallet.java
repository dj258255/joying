package com.joying.wallet.domain;

import org.hibernate.annotations.Comment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 잔액을 들고 있는 자리.
 *
 * <p>잔액은 이 엔티티를 읽고 고쳐 저장하는 방식으로 바꾸지 않는다. 동시에 두 이체가
 * 들어오면 나중에 저장한 쪽이 앞엣것을 덮어 잔액이 맞지 않게 된다. 대신
 * {@code WalletRepository}의 조건부 UPDATE로 DB에서 직접 더하고 뺀다.
 * 잔액이 모자라면 그 UPDATE가 0행을 고쳐 실패가 드러난다.
 */
@Entity
@Getter
@Table(
	name = "wallet",
	uniqueConstraints = @UniqueConstraint(name = "uk_wallet_owner", columnNames = {"owner_type", "member_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "wallet_id")
	private Long walletId;

	@Comment("지갑 주인 구분")
	@Enumerated(EnumType.STRING)
	@Column(name = "owner_type", nullable = false, length = 16)
	private WalletOwnerType ownerType;

	@Comment("회원 지갑일 때의 회원 ID. 에스크로 지갑은 비어 있다")
	@Column(name = "member_id")
	private Long memberId;

	@Comment("현재 잔액. 원 단위이며 음수가 될 수 없다")
	@Column(name = "balance", nullable = false)
	private Long balance;

	public static Wallet forMember(Long memberId) {
		Wallet wallet = new Wallet();
		wallet.ownerType = WalletOwnerType.MEMBER;
		wallet.memberId = memberId;
		wallet.balance = 0L;
		return wallet;
	}

	public static Wallet forEscrow() {
		Wallet wallet = new Wallet();
		wallet.ownerType = WalletOwnerType.ESCROW;
		wallet.memberId = null;
		wallet.balance = 0L;
		return wallet;
	}
}
