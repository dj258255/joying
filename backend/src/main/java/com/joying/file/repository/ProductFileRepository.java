package com.joying.file.repository;

import com.joying.file.domain.ProductFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductFileRepository extends JpaRepository<ProductFile,Long> {
    List<ProductFile> findByProduct_ProductId(Long productId);
    List<ProductFile> findByProduct_ProductIdIn(List<Long> productIds);
    void deleteByProduct_ProductId(Long productId);

}
