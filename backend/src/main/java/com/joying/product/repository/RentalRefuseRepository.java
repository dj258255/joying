package com.joying.product.repository;

import com.joying.product.domain.RentalRefuse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RentalRefuseRepository extends JpaRepository<RentalRefuse,String> {
    List<RentalRefuse> findByProduct_ProductId(Long productId);
    void deleteByProduct_ProductId(Long productId);
}
