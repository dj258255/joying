package com.joying.escrow.repository;

import com.joying.escrow.domain.Escrow;
import com.joying.escrow.domain.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EscrowRepository extends JpaRepository<Escrow, Long> {

    /**
     * 결제 ID로 Escrow 조회 (1:1 관계)
     */
    Optional<Escrow> findByPayment_PaymentId(Long paymentId);

    /**
     * 거래 내역 ID로 Escrow 조회
     */
    Optional<Escrow> findByRentalHistory_RentalHisId(Long rentalHisId);

    /**
     * 상태별 Escrow 목록 조회
     */
    List<Escrow> findByStatus(Status status);

    /**
     * 보증금 반환을 요청했지만 아직 반영을 확인하지 못한 건.
     */
    List<Escrow> findByDepositReleaseRequestedAtIsNotNullAndDepositReleaseConfirmedAtIsNull();

    /**
     * 결제 ID로 Escrow 존재 여부 확인
     */
    boolean existsByPayment_PaymentId(Long paymentId);
}
