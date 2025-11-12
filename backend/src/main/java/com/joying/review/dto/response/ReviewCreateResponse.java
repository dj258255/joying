package com.joying.review.dto.response;

import com.joying.product.domain.UploadType;

public record ReviewCreateResponse(
	Long reviewId,
	UploadType uploadType,
	Long productId,
	Long reviewedId
) {}