package com.joying.review.dto.request;

import java.util.List;

import com.joying.product.domain.UploadType;

import lombok.Builder;

@Builder
public record ReviewRequestDto(
	Long reviewId,
	String title,
	String content,
	UploadType uploadType,
	float rating,
	Long reviewerId,
	Long productId,
	Long reviewedId,
	Long rentalHistoryId,
	List<Long> fileIds) {
}
