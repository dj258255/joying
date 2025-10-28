package com.joying.review.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.domain.ReviewFile;
import com.joying.file.repository.FileRepository;
import com.joying.file.repository.ReviewFileRepository;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.product.domain.Product;
import com.joying.product.domain.UploadType;
import com.joying.product.repository.ProductRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.review.domain.Review;
import com.joying.review.dto.request.ReviewRequestDto;
import com.joying.review.dto.response.ReviewResponseDto;
import com.joying.review.exception.UnauthorizedReviewAccessException;
import com.joying.review.repository.ReviewRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

	private final FileUrlResolver fileUrlResolver;
	private final MemberRepository memberRepository;
	private final ProductRepository productRepository;
	private final RentalHistoryRepository rentalHistoryRepository;
	private final FileRepository fileRepository;
	private final ReviewFileRepository reviewFileRepository;
	private final ReviewRepository reviewRepository;

	public Page<ReviewResponseDto> getReviews(Long productId, int page, int size) {
		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "reviewId"));
		Page<Review> reviews = reviewRepository.findProductReviews(productId, UploadType.borrow, pageRequest);

		return reviews.map(review -> ReviewResponseDto.fromEntity(review, fileUrlResolver));
	}

	@Transactional(readOnly = true)
	public ReviewResponseDto getRentalReview(Long rentalId, String type) {
		Review review;

		if (type.equals("rent")) {
			review = reviewRepository.findRentalReview(rentalId, UploadType.rent.name());
		} else {
			review = reviewRepository.findRentalReview(rentalId, UploadType.borrow.name());
		}

		return ReviewResponseDto.fromEntity(review, fileUrlResolver);
	}

	public Long createReview(ReviewRequestDto dto, Long authId) {
		if (dto == null)
			throw new IllegalArgumentException("리뷰 요청 데이터가 비어 있습니다.");
		if (dto.reviewerId() == null)
			throw new IllegalArgumentException("리뷰 작성자 ID가 필요합니다.");
		if (dto.uploadType() == null)
			throw new IllegalArgumentException("리뷰 타입(uploadType)이 필요합니다.");
		if (dto.productId() == null)
			throw new IllegalArgumentException("리뷰 대상 상품 ID가 필요합니다.");
		if (dto.rentalHistoryId() == null)
			throw new IllegalArgumentException("대여 이력 ID가 필요합니다.");

		if (!dto.reviewerId().equals(authId)) {
			throw new UnauthorizedReviewAccessException("리뷰 작성 권한이 없습니다.");
		}

		Member reviewer = memberRepository.findById(dto.reviewerId())
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 작성자입니다."));

		Product product = productRepository.findById(dto.productId())
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다."));

		RentalHistory rentalHistory = rentalHistoryRepository.findById(dto.rentalHistoryId())
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 대여 이력입니다."));

		Member reviewed = null;
		if (dto.uploadType() == UploadType.rent || dto.uploadType() == UploadType.borrow) {
			if (dto.reviewedId() == null)
				throw new IllegalArgumentException("대여자/차용자 리뷰에는 대상 사용자 ID가 필요합니다.");

			reviewed = memberRepository.findById(dto.reviewedId())
				.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 대상 사용자입니다."));
		}

		Review review = reviewRepository.save(Review.builder()
			.title(dto.title())
			.content(dto.content())
			.uploadType(dto.uploadType())
			.rating(dto.rating())
			.reviewer(reviewer)
			.product(product)
			.reviewed(reviewed)
			.rentalHistory(rentalHistory)
			.build());

		if (dto.fileIds() != null) {
			connectFile(dto, review);
		}

		return review.getReviewId();
	}

	@Transactional
	public void updateReview(ReviewRequestDto dto, Long authId) {
		if (dto == null || dto.reviewId() == null)
			throw new IllegalArgumentException("리뷰 ID가 필요합니다.");
		if (authId == null)
			throw new UnauthorizedReviewAccessException("로그인이 필요한 요청입니다.");

		Review review = reviewRepository.findById(dto.reviewId())
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 리뷰입니다."));

		Long reviewerId = review.getReviewer().getMemberId();
		if (!authId.equals(reviewerId)) {
			throw new UnauthorizedReviewAccessException("본인의 리뷰만 수정할 수 있습니다.");
		}

		review.updateReview(dto.title(), dto.content(), dto.rating());

		if (dto.fileIds() != null) {
			List<ReviewFile> existingFiles = reviewFileRepository.findByReview(review);
			if (!existingFiles.isEmpty()) {
				reviewFileRepository.deleteAll(existingFiles);
				review.getReviewFiles().clear();
			}
			connectFile(dto, review);
		}
	}

	public void deleteReview(Long reviewId, Long authId) {
		if (reviewId == null)
			throw new IllegalArgumentException("리뷰 ID가 필요합니다.");
		if (authId == null)
			throw new UnauthorizedReviewAccessException("로그인이 필요한 요청입니다.");

		Review review = reviewRepository.findById(reviewId)
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 리뷰입니다."));

		Long reviewerId = review.getReviewer().getMemberId();
		if (!authId.equals(reviewerId)) {
			throw new UnauthorizedReviewAccessException("본인의 리뷰만 삭제할 수 있습니다.");
		}

		List<ReviewFile> reviewFiles = reviewFileRepository.findByReview(review);
		if (!reviewFiles.isEmpty()) {
			reviewFileRepository.deleteAll(reviewFiles);
		}

		reviewRepository.delete(review);
	}

	public Page<ReviewResponseDto> getMemberReviews(Long memberId, int page, int size) {
		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "reviewId"));
		Page<Review> reviews = reviewRepository.findByReviewed_MemberId(memberId, pageRequest);

		return reviews.map(review -> ReviewResponseDto.fromEntity(review, fileUrlResolver));
	}

	private void connectFile(ReviewRequestDto dto, Review review) {
		int order = 1;
		for (Long fileId : dto.fileIds()) {
			File file = fileRepository.findById(fileId)
				.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일입니다."));

			ReviewFile reviewFile = ReviewFile.builder()
				.file(file)
				.sortOrder(order++)
				.review(review)
				.build();

			reviewFileRepository.save(reviewFile);
			review.addReviewFile(reviewFile);
		}
	}
}
