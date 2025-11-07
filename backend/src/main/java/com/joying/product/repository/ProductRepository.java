package com.joying.product.repository;

import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @EntityGraph(attributePaths = {
            "writer", "sido", "gungu", "dong", "category"
    })
    Optional<Product> findByProductId(Long productId);

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

    @Query(value = """
    SELECT DISTINCT rh.rentalProduct.productId
    FROM RentalHistory rh
    WHERE rh.rentalProduct.productId IN :productIds
      AND rh.startRen <= :dateTo
      AND rh.endRen >= :dateFrom
    UNION
    SELECT DISTINCT rr.product.productId
    FROM RentalRefuse rr
    WHERE rr.product.productId IN :productIds
      AND rr.startRef <= :dateTo
      AND rr.endRef >= :dateFrom
""")
    List<Long> findUnavailableProductIds(
        List<Long> productIds,
        Instant dateFrom,
        Instant dateTo
    );

    @Query("""
    SELECT p.productId
    FROM Product p
    WHERE p.productId IN :productIds
    AND p.rating < :rating
    """)
    List<Long> findProductIdsWithRatingLessThan(
        List<Long> productIds,
        double rating
    );

    @EntityGraph(attributePaths = {"sido", "gungu", "dong"})
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"sido", "gungu", "dong", "category", "writer"})
    Page<Product> findByWriter_MemberId(Long memberId, Pageable pageable);
}
