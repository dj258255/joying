package com.joying.rental.repository;

import com.joying.rental.domain.RentalVideo;
import com.joying.rental.domain.VideoType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RentalVideoRepository extends JpaRepository<RentalVideo, Long> {

    /**
     * 거래 내역의 모든 영상 조회
     */
    List<RentalVideo> findByRentalHistory_RentalHisId(Long rentalHisId);

    /**
     * 거래 내역의 특정 타입 영상 조회
     */
    Optional<RentalVideo> findByRentalHistory_RentalHisIdAndVideoType(Long rentalHisId, VideoType videoType);

    /**
     * 영상 존재 여부 확인
     */
    boolean existsByRentalHistory_RentalHisIdAndVideoType(Long rentalHisId, VideoType videoType);

    /**
     * File과 조인하여 조회 (N+1 방지)
     */
    @Query("SELECT rv FROM RentalVideo rv " +
           "JOIN FETCH rv.file " +
           "WHERE rv.rentalHistory.rentalHisId = :rentalHisId")
    List<RentalVideo> findByRentalHisIdWithFile(@Param("rentalHisId") Long rentalHisId);
}