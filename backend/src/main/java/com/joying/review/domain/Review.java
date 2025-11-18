package com.joying.review.domain;

import java.util.ArrayList;
import java.util.List;

import com.joying.common.entity.BaseEntity;
import com.joying.file.domain.ReviewFile;
import com.joying.member.domain.Member;
import com.joying.product.domain.Product;
import com.joying.product.domain.UploadType;
import com.joying.rental.domain.RentalHistory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(
        name = "review",
        indexes = {
                @Index(name = "idx_review_product", columnList = "product_id"),
                @Index(name = "idx_review_reviewer", columnList = "reviewer_id"),
                @Index(name = "idx_review_reviewed", columnList = "reviewed_id")
        },
        uniqueConstraints = {
                // 한 멤버가 같은 상품에 리뷰를 한 번만
                @UniqueConstraint(name = "uk_review_reviewer_rental_his", columnNames = {"reviewer_id", "rental_his_id"})
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "reviewId", callSuper=false)
public class Review extends BaseEntity {

    @Id
    @Column(name = "review_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @Comment("제목")
    @Column(name = "title")
    private String title;

    @Comment("내용")
    @Column(name = "content", length = 1000)
    private String content;

    @Comment("등록 타입")
    @Enumerated(value=EnumType.STRING)
    @Column(name = "upload_type")
    private UploadType uploadType;

    @Comment("평점")
    @Column(name = "rating")
    private Float rating;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", referencedColumnName = "member_id", nullable = false)
    private Member reviewer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", referencedColumnName = "product_id", nullable = true)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "reviewed_id", referencedColumnName = "member_id")
    private Member reviewed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", referencedColumnName = "rental_his_id")
    private RentalHistory rentalHistory;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReviewFile> reviewFiles = new ArrayList<>();

    @Builder
    private Review(String title,
                   String content,
                   UploadType uploadType,
                   Float rating,
                   Member reviewer,
                   Product product,
                   Member reviewed,
                   RentalHistory rentalHistory) {
        this.title = title;
        this.content = content;
        this.uploadType = uploadType;
        this.rating = rating != null ? rating : 0.0f; // 기본값 방어
        this.reviewer = reviewer;
        this.product = product;
        this.reviewed = reviewed;
        this.rentalHistory = rentalHistory;
    }

    public void updateReview(String title, String content, Float rating) {
        if (title != null) this.title = title;
        if (content != null) this.content = content;
        if (rating >= 0) this.rating = rating;
    }

    public void addReviewFile(ReviewFile reviewFile) {
        this.reviewFiles.add(reviewFile);
        reviewFile.addReview(this);
    }

    public void detachProductReference() {
        this.product = null;
    }
}