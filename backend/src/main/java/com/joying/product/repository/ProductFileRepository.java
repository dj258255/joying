package com.joying.product.repository;

import com.joying.file.domain.ProductFile;
import com.joying.product.dto.ProductResponseDto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductFileRepository extends JpaRepository<ProductFile,String> {
    List<ProductFile> findByProduct_ProductId(Long productId);
}
