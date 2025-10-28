package com.joying.review.repository;

import com.joying.product.domain.UploadType;
import com.joying.review.domain.Review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProduct_ProductIdOrderByReviewIdDesc(Long productId);

    int countByProduct_ProductId(Long productId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.productId = :productId")
    Double avgRatingByProductId(Long productId);

    @Query(
        value = """
        SELECT r FROM Review r
        WHERE r.product.productId = :productId
        AND r.uploadType = :uploadType
        ORDER BY r.reviewId DESC
    """,
        countQuery = """
        SELECT COUNT(r) FROM Review r
        WHERE r.product.productId = :productId
        AND r.uploadType = :uploadType
    """
    )
    Page<Review> findProductReviews(Long productId, UploadType uploadType, Pageable pageable);

    @EntityGraph(attributePaths = {"reviewer"})
    @Query("""
    SELECT r FROM Review r
    JOIN r.rentalHistory rh
    WHERE rh.rentalHisId = :rentalId
    AND (
        (:type = 'rent' AND r.reviewed = rh.member)
        OR (:type = 'borrow' AND r.reviewer = rh.member)
    )
    """)
    Review findRentalReview(Long rentalId, String type);

    @EntityGraph(attributePaths = {"reviewer", "product"})
    Page<Review> findByReviewed_MemberId(Long memberId, Pageable pageable);
}
