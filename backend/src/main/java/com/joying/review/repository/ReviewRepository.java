package com.joying.review.repository;

import com.joying.product.domain.UploadType;
import com.joying.review.domain.Review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProduct_ProductIdAndUploadTypeOrderByReviewIdDesc(Long productId, UploadType uploadType);

    int countByProduct_ProductId(Long productId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.productId = :productId")
    Double avgRatingByProductId(Long productId);

    @EntityGraph(attributePaths = {"reviewer", "reviewFiles"})
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

    @EntityGraph(attributePaths = {"reviewer", "reviewFiles"})
    @Query("""
    SELECT r FROM Review r
    JOIN r.rentalHistory rh
    WHERE rh.rentalHisId = :rentalId
    AND (
        (:uploadType = 'RENT' AND r.reviewer = rh.member)
        OR (:uploadType = 'BORROW' AND r.reviewed = rh.member)
    )
    """)
    Review findRentalReview(Long rentalId, String uploadType);

    @EntityGraph(attributePaths = {"reviewer", "product", "reviewFiles", "reviewFiles.file"})
    Page<Review> findByReviewed_MemberIdAndUploadType(Long memberId, UploadType uploadType, Pageable pageable);

    @EntityGraph(attributePaths = {"reviewFiles", "reviewFiles.file"})
    @Query("""
    SELECT r FROM Review r
    JOIN FETCH r.reviewer w
    JOIN FETCH r.rentalHistory rh
    JOIN FETCH rh.rentalProduct rp
    WHERE r.reviewId = :reviewId
""")
    Optional<Review> findByIdWithWriterAndProduct(Long reviewId);
}
