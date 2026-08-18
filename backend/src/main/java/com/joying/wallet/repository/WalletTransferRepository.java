package com.joying.wallet.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.joying.wallet.domain.WalletTransfer;

public interface WalletTransferRepository extends JpaRepository<WalletTransfer, Long> {

	Optional<WalletTransfer> findByReference(String reference);
}
