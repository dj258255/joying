package com.joying.review.service;

import java.util.Comparator;
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
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.review.domain.Review;
import com.joying.review.dto.request.ReviewRequestDto;
import com.joying.review.dto.response.ReviewCreateResponse;
import com.joying.review.dto.response.ReviewResponseDto;
import com.joying.review.exception.CannotWriteReviewException;
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
	private final RentalHistoryRepository rentalHistoryRepository;
	private final FileRepository fileRepository;
	private final ReviewFileRepository reviewFileRepository;
	private final ReviewRepository reviewRepository;

	@Transactional(readOnly = true)
	public Page<ReviewResponseDto> getReviews(Long productId, int page, int size) {
		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "reviewId"));
		Page<Review> reviews = reviewRepository.findProductReviews(productId, UploadType.BORROW, pageRequest);
		return reviews.map(this::toResponseDto);
	}

	@Transactional(readOnly = true)
	public ReviewResponseDto getRentalReview(Long rentalId, UploadType uploadType) {
		Review review = reviewRepository.findRentalReview(
			rentalId, uploadType.name()
		);
		return toResponseDto(review);
	}

	@Transactional(readOnly = true)
	public ReviewResponseDto getReview(Long reviewId, Long authId) {
		Review review = reviewRepository.findByIdWithWriterAndProduct(reviewId)
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 리뷰입니다."));

		if (!review.getReviewer().getMemberId().equals(authId)) {
			throw new UnauthorizedReviewAccessException("리뷰를 조회할 권한이 없습니다.");
		}

		return toResponseDto(review);
	}

	@Transactional
	public ReviewCreateResponse createReview(ReviewRequestDto dto, Long authId) {
		if (dto == null) throw new IllegalArgumentException("리뷰 요청 데이터가 비어 있습니다.");
		if (dto.rentalHistoryId() == null)
			throw new IllegalArgumentException("대여 이력 ID가 필요합니다.");

		// 로그인 사용자
		Member reviewer = memberRepository.findById(authId)
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 작성자입니다."));

		// 대여 이력
		RentalHistory rentalHistory = rentalHistoryRepository.findWithProductAndMemberById(dto.rentalHistoryId())
			.orElseThrow(() -> new EntityNotFoundException("존재하지 않는 대여 이력입니다."));

		if (!rentalHistory.getStatus().equals(RentalStatus.DEPOSIT_RETURNED)) {
			throw new CannotWriteReviewException("아직 리뷰를 작성할 수 없습니다. 대여가 완전히 종료되지 않았습니다.");
		}

		UploadType uploadType;
		if (!rentalHistory.getMember().equals(reviewer) && !rentalHistory.getRentalProduct().getWriter().equals(reviewer)) {
			throw new UnauthorizedReviewAccessException("해당 대여에 리뷰를 작성할 수 없습니다.");
		} else if (rentalHistory.getMember().equals(reviewer)) {
			uploadType = UploadType.BORROW;
		} else {
			uploadType = UploadType.RENT;
		}

		// 상품
		Product product = rentalHistory.getRentalProduct();

		Member reviewed;
		if (uploadType == UploadType.BORROW) {
			// 빌린 사람이 리뷰 작성 → 리뷰 대상은 빌려준 사람
			reviewed = product.getWriter();
			if (!rentalHistory.getMember().getMemberId().equals(authId)) {
				throw new UnauthorizedReviewAccessException("해당 대여에 대한 리뷰 작성 권한이 없습니다.");
			}
			if (product.getWriter().getMemberId().equals(reviewer.getMemberId())) {
				throw new UnauthorizedReviewAccessException("본인이 본인 상품에 대한 리뷰를 작성할 수 없습니다.");
			}
			product.updateRating(dto.rating()); // 상품 평점 업데이트
		} else {
			// 빌려준 사람이 리뷰 작성 → 리뷰 대상은 빌린 사람
			if (!product.getWriter().getMemberId().equals(authId)) {
				throw new UnauthorizedReviewAccessException("해당 대여에 대한 리뷰 작성 권한이 없습니다.");
			}
			reviewed = rentalHistory.getMember();
			if (reviewed.getMemberId().equals(reviewer.getMemberId())) {
				throw new UnauthorizedReviewAccessException("본인에 대한 리뷰를 작성할 수 없습니다.");
			}
			reviewed.updateRating(dto.rating()); // 사용자 평점 업데이트
		}

		Review review = reviewRepository.save(Review.builder()
			.title(dto.title())
			.content(dto.content())
			.uploadType(uploadType)
			.rating(dto.rating())
			.reviewer(reviewer)
			.product(product)
			.reviewed(reviewed)
			.rentalHistory(rentalHistory)
			.build());

		if (dto.fileIds() != null) {
			connectFile(dto, review);
		}

		return new ReviewCreateResponse(
			review.getReviewId(),
			review.getUploadType(),
			review.getProduct() != null ? product.getProductId() : null,
			reviewed.getMemberId()
		);
	}

	@Transactional
	public void updateReview(Long reviewId, ReviewRequestDto dto, Long authId) {
		if (dto == null || reviewId == null)
			throw new IllegalArgumentException("리뷰 ID가 필요합니다.");
		if (authId == null)
			throw new UnauthorizedReviewAccessException("로그인이 필요한 요청입니다.");

		Review review = reviewRepository.findById(reviewId)
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

	public Page<ReviewResponseDto> getMemberReviews(Long memberId, UploadType uploadType, int page, int size) {
		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "reviewId"));
		Page<Review> reviews = reviewRepository.findByReviewed_MemberIdAndUploadType(memberId, uploadType, pageRequest);
		return reviews.map(this::toResponseDto);
	}

	/** 리뷰 이미지 URL 목록 생성 */
	private List<String> resolveReviewImageUrls(Review review) {
		if (review.getReviewFiles() == null || review.getReviewFiles().isEmpty()) return List.of();

		return review.getReviewFiles().stream()
			.sorted(Comparator.comparingInt(ReviewFile::getSortOrder))
			.map(ReviewFile::getFile)
			.map(fileUrlResolver::toPublicUrl)
			.toList();
	}

	/** 리뷰 작성자 프로필 이미지 URL 생성 */
	private String resolveReviewerProfileImage(Review review) {
		if (review.getReviewer().getProfileImage() == null) {
			return review.getReviewer().getKakaoProfileImageUrl();
		}
		return fileUrlResolver.toPublicUrl(review.getReviewer().getProfileImage());
	}

	/** Review → DTO 변환 (공통) */
	private ReviewResponseDto toResponseDto(Review review) {
		List<String> imageUrls = resolveReviewImageUrls(review);
		String profileImageUrl = resolveReviewerProfileImage(review);
		return ReviewResponseDto.fromEntity(review, profileImageUrl, imageUrls);
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
