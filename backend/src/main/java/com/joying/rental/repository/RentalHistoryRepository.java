package com.joying.rental.repository;

import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalHistoryRepository extends JpaRepository<RentalHistory, Long> {

    /**
     * 회원의 거래 내역 조회
     */
    List<RentalHistory> findByMember_MemberId(Long memberId);

    /**
     * 상품의 거래 내역 조회
     */
    List<RentalHistory> findByRentalProduct_ProductId(Long productId);

    /**
     * 상태별 거래 내역 조회
     */
    List<RentalHistory> findByStatus(RentalStatus status);

    /**
     * 회원의 특정 상태 거래 내역 조회
     */
    List<RentalHistory> findByMember_MemberIdAndStatus(Long memberId, RentalStatus status);
}
