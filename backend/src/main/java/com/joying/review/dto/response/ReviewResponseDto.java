package com.joying.review.dto.response;

import java.time.Instant;
import java.util.List;

import com.joying.review.domain.Review;

import lombok.Builder;

@Builder
public record ReviewResponseDto (
	Long reviewId,
	String title,
	String content,
	float rating,
	String nickname,
	Long reviewerId,
	Instant createdAt,
	String profileImageUrl,
	List<String> imageUrls,
	List<Long> fileIds) {

	public static ReviewResponseDto fromEntity(Review review, String profileImageUrl, List<String> urls) {
		return ReviewResponseDto.builder()
			.reviewId(review.getReviewId())
			.title(review.getTitle())
			.content(review.getContent())
			.rating(review.getRating())
			.nickname(review.getReviewer() != null ? review.getReviewer().getNickname() : null)
			.reviewerId(review.getReviewer().getMemberId())
			.createdAt(review.getCreatedAt())
			.profileImageUrl(profileImageUrl)
			.imageUrls(urls)
			.fileIds(review.getReviewFiles().stream()
				.map(rf -> rf.getFile().getFileId())
				.toList())
			.build();
	}
}
