package com.joying.file.domain;

import org.hibernate.annotations.Comment;

import com.joying.common.entity.BaseEntity;
import com.joying.review.domain.Review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
	name = "review_file",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_review_file_review_file", columnNames = {"review_id", "file_id"})
	},
	indexes = {
		@Index(name = "idx_review_file_product", columnList = "review_id"),
		@Index(name = "idx_review_file_file", columnList = "file_id")
	}
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "reviewFileId", callSuper=false)
public class ReviewFile extends BaseEntity {
	@Id
	@Column(name = "review_file_id")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long reviewFileId;

	@Comment("리뷰")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "reviewId", referencedColumnName = "review_id", nullable = false)
	private Review review;

	@Comment("파일")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "fileId", referencedColumnName = "file_id", nullable = false)
	private File file;

	@Comment("정렬 순서 (작을수록 먼저)")
	@Column(name = "sort_order")
	private Integer sortOrder;

	@Builder
	private ReviewFile(Review review, File file, Integer sortOrder) {
		this.review = review;
		this.file = file;
		this.sortOrder = sortOrder;
	}

	public void addReview(Review review) {
		this.review = review;
	}
}