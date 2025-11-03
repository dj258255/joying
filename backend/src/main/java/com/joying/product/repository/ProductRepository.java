package com.joying.product.repository;

import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @EntityGraph(attributePaths = {
            "writer", "sido", "gungu", "dong", "category"
    })
    Optional<Product> findByProductId(Long productId);

    /**
     * 비관적 락을 사용한 상품 조회 (동시성 제어)
     * - 예약 생성 시 동시 요청을 직렬화하여 처리
     * - SELECT ... FOR UPDATE 쿼리 실행
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.productId = :productId")
    Optional<Product> findByIdWithLock(@Param("productId") Long productId);

    @Query("""
    SELECT DISTINCT p
    FROM Product p
    JOIN FETCH p.dong d
    JOIN FETCH d.gungu g
    JOIN FETCH g.sido s
    LEFT JOIN p.category c
    LEFT JOIN HashtagHistory hh ON hh.product = p
    LEFT JOIN hh.hashtag h
    LEFT JOIN RentalHistory rh
        ON rh.rentalProduct = p
        AND ( :dateTo IS NULL OR rh.startRen <= :dateTo )
        AND ( :dateFrom IS NULL OR rh.endRen >= :dateFrom )
    LEFT JOIN RentalRefuse rr
        ON rr.product = p
        AND ( :dateTo IS NULL OR rr.startRef <= :dateTo )
        AND ( :dateFrom IS NULL OR rr.endRef >= :dateFrom )
    WHERE
      (:q IS NULL OR (p.title LIKE %:q% OR p.content LIKE %:q%))
      AND (:minPrice IS NULL OR p.rentalFee >= :minPrice)
      AND (:maxPrice IS NULL OR p.rentalFee <= :maxPrice)
      AND (:dong IS NULL OR p.dong.dongId = :dong)
      AND (:method IS NULL OR p.rentMethod = :method)
      AND (:rating IS NULL OR p.rating >= :rating)
      AND (:categoryIds IS NULL OR c.categoryId IN :categoryIds)
      AND (
           :hashtagCount IS NULL OR
           (
             SELECT COUNT(DISTINCT hh2.hashtag.hashtagId)
             FROM HashtagHistory hh2
             WHERE hh2.product = p
               AND hh2.hashtag.hashtagId IN :hashtagIds
           ) = :hashtagCount
        )
      AND (
           (:dateFrom IS NULL OR :dateTo IS NULL)
           OR (rh.rentalHisId IS NULL AND rr.rentalRefuseId IS NULL)
      )
    """)
    Page<Product> searchProducts(
        String q,
        Integer minPrice,
        Integer maxPrice,
        Long dong,
        Instant dateFrom,
        Instant dateTo,
        Double rating,
        RentMethod method,
        List<Long> categoryIds,
        List<Long> hashtagIds,
        Integer hashtagCount,
        Pageable pageable
    );
}
