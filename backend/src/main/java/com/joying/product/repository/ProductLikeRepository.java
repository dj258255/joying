package com.joying.product.repository;

import com.joying.product.domain.ProductLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductLikeRepository extends JpaRepository<ProductLike,String> {
    boolean existsByProduct_ProductIdAndMember_MemberId(Long productId, Long memberId);

    int countByProduct_ProductId(Long productId);
}
