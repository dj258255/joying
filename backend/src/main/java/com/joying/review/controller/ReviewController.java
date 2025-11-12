package com.joying.review.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.common.dto.PagedResponse;
import com.joying.common.response.ApiResponse;
import com.joying.product.domain.UploadType;
import com.joying.review.dto.request.ReviewRequestDto;
import com.joying.review.dto.response.ReviewResponseDto;
import com.joying.review.service.ReviewService;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/review")
public class ReviewController {

	private final ReviewService reviewService;

	@Operation(summary = "상품 리뷰 조회", description = "물품에 대한 리뷰를 조회합니다.")
	@GetMapping("product/{productId}")
	public ResponseEntity<?> getReviews(
		@PathVariable Long productId,
		@RequestParam(required = false, defaultValue = "1") int page,
		@RequestParam(required = false, defaultValue = "3") int size) {
		Page<ReviewResponseDto> reviews = reviewService.getReviews(productId, page, size);

		PagedResponse<ReviewResponseDto> response = PagedResponse.<ReviewResponseDto>builder()
			.data(reviews.getContent())
			.totalCount(reviews.getTotalElements())
			.page(page)
			.size(size)
			.build();

		return ApiResponse.ok("리뷰 리스트 조회 성공", response);
	}

	@Operation(summary = "대여 리뷰 조회", description = "대여(rentalId)에 대해 rent(빌려준사람) 또는 borrow(빌린사람)에 대한 리뷰를 조회합니다.")
	@GetMapping("/rental/{rentalId}")
	public ResponseEntity<?> getRentalReviews(
		@PathVariable Long rentalId,
		@RequestParam UploadType uploadType) {

		if (!uploadType.equals(UploadType.RENT) && !uploadType.equals(UploadType.BORROW)) {
			throw new IllegalArgumentException("type은 RENT 또는 BORROW 중 하나여야 합니다.");
		}

		ReviewResponseDto reviewResponseDto = reviewService.getRentalReview(rentalId, uploadType);
		return ApiResponse.ok("리뷰 조회 성공", reviewResponseDto);
	}

	@Operation(summary = "리뷰 단건 조회", description = "리뷰 ID로 단건 리뷰를 조회합니다.")
	@GetMapping("/{reviewId}")
	public ResponseEntity<?> getReview(
		@PathVariable Long reviewId,
		Authentication authentication
	) {
		Long authId = Long.parseLong(authentication.getName());
		ReviewResponseDto response = reviewService.getReview(reviewId, authId);
		return ApiResponse.ok(response);
	}

	@Operation(summary = "상품 리뷰 작성", description = "물품에 대한 리뷰를 작성합니다.")
	@PostMapping
	public ResponseEntity<?> createReview(
		@RequestBody ReviewRequestDto dto,
		Authentication authentication) {
		Long authId = Long.parseLong(authentication.getName());
		return ApiResponse.created(reviewService.createReview(dto, authId));
	}

	@Operation(summary = "리뷰 수정", description = "리뷰를 수정합니다.(제목, 내용, 평점)")
	@PatchMapping("/{reviewId}")
	public ResponseEntity<?> updateReview(
		@PathVariable Long reviewId,
		@RequestBody ReviewRequestDto dto,
		Authentication authentication) {
		Long authId = Long.parseLong(authentication.getName());
		reviewService.updateReview(reviewId, dto, authId);
		return ApiResponse.ok("리뷰가 수정되었습니다.", null);
	}

	@Operation(summary = "리뷰 삭제", description = "리뷰를 삭제합니다.")
	@DeleteMapping("/{reviewId}")
	public ResponseEntity<?> deleteReview(
		@PathVariable Long reviewId,
		Authentication authentication) {
		Long authId = Long.parseLong(authentication.getName());
		reviewService.deleteReview(reviewId, authId);
		return ApiResponse.noContent();
	}

	@GetMapping("/member/{memberId}")
	public ResponseEntity<?> getMemberReviews(
		@PathVariable Long memberId,
		@RequestParam(required = false, defaultValue = "1") int page,
		@RequestParam(required = false, defaultValue = "3") int size
	) {
		Page<ReviewResponseDto> reviews = reviewService.getMemberReviews(memberId, page, size);

		PagedResponse<ReviewResponseDto> response = PagedResponse.<ReviewResponseDto>builder()
			.data(reviews.getContent())
			.totalCount(reviews.getTotalElements())
			.page(page)
			.size(size)
			.build();

		return ApiResponse.ok("인물 리뷰 리스트 조회 성공", response);
	}
}
