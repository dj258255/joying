package com.joying.review.repository;

import com.joying.review.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review,String> {
    List<Review> findByProduct_ProductIdOrderByReviewIdDesc(Long productId);

    int countByProduct_ProductId(Long productId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.productId = :productId")
    Double avgRatingByProductId(Long productId);
}
