package com.joying.wallet.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.joying.wallet.domain.WalletEntry;

public interface WalletEntryRepository extends JpaRepository<WalletEntry, Long> {

	List<WalletEntry> findByWalletIdOrderByEntryIdAsc(Long walletId);

	List<WalletEntry> findByTransferId(Long transferId);
}
