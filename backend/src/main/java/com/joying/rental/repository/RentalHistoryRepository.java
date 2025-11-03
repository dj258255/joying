package com.joying.rental.repository;

import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * 멱등성 체크: 같은 사용자가 같은 상품에 대해 활성 예약이 있는지 확인
     * - PENDING: 결제 대기 중
     * - ESCROW: 결제 완료, 에스크로 보관 중
     * 더블클릭으로 인한 중복 예약 방지용
     */
    @Query("SELECT r FROM RentalHistory r " +
           "WHERE r.rentalProduct.productId = :productId " +
           "AND r.member.memberId = :memberId " +
           "AND r.status IN :statuses")
    Optional<RentalHistory> findActiveReservation(
            @Param("productId") Long productId,
            @Param("memberId") Long memberId,
            @Param("statuses") List<RentalStatus> statuses
    );
}
