package com.joying.review.dto.response;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.ReviewFile;
import com.joying.review.domain.Review;

import lombok.Builder;

@Builder
public record ReviewResponseDto (
	Long reviewId,
	String title,
	String content,
	float rating,
	String reviewerName,
	List<String> imageUrls) {

	public static ReviewResponseDto fromEntity(Review review, FileUrlResolver urlProvider) {
		List<String> urls = null;
		if (review.getReviewFiles() != null && !review.getReviewFiles().isEmpty()) {
			urls = review.getReviewFiles().stream()
				.sorted(Comparator.comparingInt(ReviewFile::getSortOrder))
				.map(ReviewFile::getFile)
				.map(urlProvider::toPublicUrl)
				.collect(Collectors.toList());
		}

		return ReviewResponseDto.builder()
			.reviewId(review.getReviewId())
			.title(review.getTitle())
			.content(review.getContent())
			.rating(review.getRating())
			.reviewerName(review.getReviewer() != null ? review.getReviewer().getName() : null)
			.imageUrls(urls)
			.build();
	}
}
