package com.joying.file.repository;

import com.joying.file.domain.ProductFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductFileRepository extends JpaRepository<ProductFile,Long> {
    List<ProductFile> findByProduct_ProductId(Long productId);
    List<ProductFile> findByProduct_ProductIdIn(List<Long> productIds);
    void deleteByProduct_ProductId(Long productId);
    @Query("SELECT pf FROM ProductFile pf JOIN FETCH pf.file WHERE pf.product.productId IN :productIds AND pf.sortOrder = 0")
    List<ProductFile> findThumbnailsByProductIds(List<Long> productIds);

}
