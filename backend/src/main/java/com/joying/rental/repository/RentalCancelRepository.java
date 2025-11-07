package com.joying.rental.repository;

import com.joying.rental.domain.CancelStatus;
import com.joying.rental.domain.RentalCancel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RentalCancelRepository extends JpaRepository<RentalCancel, Long> {

    /**
     * 대여 내역의 최신 취소 요청 조회
     */
    @Query("SELECT r FROM RentalCancel r " +
           "WHERE r.rentalHistory.rentalHisId = :rentalHisId " +
           "ORDER BY r.createdAt DESC LIMIT 1")
    Optional<RentalCancel> findLatestByRentalHisId(@Param("rentalHisId") Long rentalHisId);

    /**
     * 대여 내역의 특정 상태 취소 요청 조회
     */
    @Query("SELECT r FROM RentalCancel r " +
           "WHERE r.rentalHistory.rentalHisId = :rentalHisId " +
           "AND r.status = :status")
    Optional<RentalCancel> findByRentalHisIdAndStatus(
            @Param("rentalHisId") Long rentalHisId,
            @Param("status") CancelStatus status
    );
}
