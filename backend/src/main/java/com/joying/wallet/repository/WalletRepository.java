package com.joying.wallet.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.joying.wallet.domain.Wallet;
import com.joying.wallet.domain.WalletOwnerType;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

	Optional<Wallet> findByOwnerTypeAndMemberId(WalletOwnerType ownerType, Long memberId);

	Optional<Wallet> findFirstByOwnerType(WalletOwnerType ownerType);

	/**
	 * 잔액이 충분할 때만 뺀다.
	 *
	 * <p>엔티티를 읽어서 빼고 저장하면, 동시에 들어온 두 이체가 같은 잔액을 읽고
	 * 각자 빼서 저장해 한쪽이 사라진다. 잔액이 음수로 내려가는 것도 그렇게 생긴다.
	 * 조건을 WHERE에 넣어 DB가 한 번에 판정하게 하면 그 경합이 없다.
	 *
	 * @return 고친 행 수. 0이면 잔액이 모자라 빼지 않은 것이다
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("update Wallet w set w.balance = w.balance - :amount "
		+ "where w.walletId = :walletId and w.balance >= :amount")
	int withdrawIfEnough(@Param("walletId") Long walletId, @Param("amount") long amount);

	/**
	 * 넣는다. 넣는 쪽은 막을 조건이 없다.
	 *
	 * @return 고친 행 수. 0이면 그런 지갑이 없는 것이다
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("update Wallet w set w.balance = w.balance + :amount where w.walletId = :walletId")
	int deposit(@Param("walletId") Long walletId, @Param("amount") long amount);
}
