package com.joying.rental.repository;

import com.joying.rental.domain.CancelStatus;
import com.joying.rental.dto.request.RentalCancelRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RentalCancelRequestRepository extends JpaRepository<RentalCancelRequest, Long> {

    /**
     * 대여 내역의 최신 취소 요청 조회
     */
    @Query("SELECT r FROM RentalCancelRequest r " +
           "WHERE r.rentalHistory.rentalHisId = :rentalHisId " +
           "ORDER BY r.requestedAt DESC LIMIT 1")
    Optional<RentalCancelRequest> findLatestByRentalHisId(@Param("rentalHisId") Long rentalHisId);

    /**
     * 대여 내역의 대기 중인 취소 요청 조회
     */
    @Query("SELECT r FROM RentalCancelRequest r " +
           "WHERE r.rentalHistory.rentalHisId = :rentalHisId " +
           "AND r.status = :status")
    Optional<RentalCancelRequest> findByRentalHisIdAndStatus(
            @Param("rentalHisId") Long rentalHisId,
            @Param("status") CancelStatus status
    );
}
