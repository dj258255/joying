package com.joying.product.repository;

import com.joying.product.domain.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @EntityGraph(attributePaths = {
            "writer", "sido", "gungu", "dong", "category"
    })
    Optional<Product> findByProductId(Long productId);
}
