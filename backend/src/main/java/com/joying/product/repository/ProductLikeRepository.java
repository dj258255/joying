package com.joying.product.repository;

import java.util.List;

import com.joying.product.domain.Product;
import com.joying.product.domain.ProductLike;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductLikeRepository extends JpaRepository<ProductLike,String> {
    boolean existsByProduct_ProductIdAndMember_MemberId(Long productId, Long memberId);
    void  deleteByProduct_ProductId(Long productId);
    void deleteByProduct_ProductIdAndMember_MemberId(Long productId, Long memberId);
    @Query("""
        SELECT p
        FROM ProductLike pl
        JOIN pl.product p
        LEFT JOIN FETCH p.sido
        LEFT JOIN FETCH p.gungu
        LEFT JOIN FETCH p.dong
        LEFT JOIN FETCH p.category
        JOIN FETCH p.writer
        WHERE pl.member.memberId = :memberId
        """)
    Page<Product> findLikedProductsByMemberId(Long memberId, Pageable pageable);

    @Query("""
        select pl.product.productId
        from ProductLike pl
        where pl.member.memberId = :memberId
          and pl.product.productId in :productIds
    """)
    List<Long> findLikedProductIdsByMemberAndProductIds(
        Long memberId,
        List<Long> productIds
    );
}
