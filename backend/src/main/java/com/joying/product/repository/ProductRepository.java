package com.joying.product.repository;

import com.joying.product.domain.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
