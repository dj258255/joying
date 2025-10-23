package com.joying.product.service;

import com.joying.category.domain.Category;
import com.joying.hashtag.repository.HashtagHistoryRepository;
import com.joying.product.domain.Product;
import com.joying.product.dto.ProductResponseDto;
import com.joying.product.repository.*;
import com.joying.review.repository.ReviewRepository;
import com.joying.region.domain.Sido;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Dong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductLikeRepository productLikeRepository;
    private final ProductFileRepository productFileRepository;
    private final HashtagHistoryRepository hashtagHistoryRepository;
    private final ReviewRepository reviewRepository;
    private final RentalRefuseRepository rentalRefuseRepository;
    private final com.joying.file.component.FileUrlResolver fileUrlResolver;

    @Override
    public ProductResponseDto.ProductDetail getProductInfo(Long productId) {
        return getProductInfo(productId, null);
    }

    @Override
    public ProductResponseDto.ProductDetail getProductInfo(Long productId, Long memberId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."));

        // 찜 여부 (memberId가 있을 때만 조회)
        boolean liked = (memberId != null)
                && productLikeRepository.existsByProduct_ProductIdAndMember_MemberId(productId, memberId);

        // 파일 리스트 (URL 조합)
        List<ProductResponseDto.FileDto> fileDtos =
                productFileRepository.findByProduct_ProductId(productId).stream()
                        .map(pf -> ProductResponseDto.FileDto.builder()
                                .fileId(pf.getFile().getFileId())
                                .url(fileUrlResolver.toPublicUrl(pf.getFile()))
                                .thumbnail(pf.isThumbnail())
                                .sortOrder(pf.getSortOrder())
                                .build())
                        .toList();

        // 해시태그
        List<String> hashtags = hashtagHistoryRepository.findByProduct_ProductId(productId).stream()
                .map(hh -> hh.getHashtag().getHashtagName())
                .toList();

        // 리뷰
        var reviewDtos = reviewRepository.findByProduct_ProductIdOrderByReviewIdDesc(productId).stream()
                .map(r -> ProductResponseDto.ReviewSummaryDto.builder()
                        .reviewId(r.getReviewId())
                        .title(r.getTitle())
                        .content(r.getContent())
                        .rating(r.getRating())
                        .reviewer(ProductResponseDto.ReviewerDto.builder()
                                .memberId(r.getReviewer().getMemberId())
                                .name(r.getReviewer().getName())
                                .profileImageUrl(
                                        r.getReviewer().getProfileImage() != null
                                                ? fileUrlResolver.toPublicUrl(r.getReviewer().getProfileImage())
                                                : null
                                )
                                .build())
                        .build())
                .toList();

        int totalReviewCount = reviewRepository.countByProduct_ProductId(productId);
        Double avgRating = reviewRepository.avgRatingByProductId(productId);

        // 대여불가 기간
        var refuseDtos = rentalRefuseRepository.findByProduct_ProductId(productId).stream()
                .map(r -> ProductResponseDto.RentalRefuseDto.builder()
                        .startRef(r.getStartRef().toInstant())
                        .endRef(r.getEndRef().toInstant())
                        .build())
                .toList();

        // 카테고리
        Category category = product.getCategory();
        ProductResponseDto.CategoryDto categoryDto = null;
        if (category != null) {
            categoryDto = ProductResponseDto.CategoryDto.builder()
                    .categoryId(category.getCategoryId())
                    .name(category.getCategoryName())
                    .path(buildCategoryPath(category))
                    .build();
        }

        // 지역
        Sido sido = product.getSido();
        Gungu gungu = product.getGungu();
        Dong dong = product.getDong();
        var regionDto = ProductResponseDto.RegionDto.builder()
                .sido(sido != null ? sido.getName() : null)
                .gungu(gungu != null ? gungu.getName() : null)
                .dong(dong != null ? dong.getName() : null)
                .build();

        // 작성자
        var writer = product.getWriter();
        var writerDto = ProductResponseDto.WriterDto.builder()
                .memberId(writer.getMemberId())
                .name(writer.getName())
                .profileImageUrl(
                        writer.getProfileImage() != null
                                ? fileUrlResolver.toPublicUrl(writer.getProfileImage())
                                : null
                )
                .rating(writer.getRating())
                .build();

        // 최종 DTO
        return ProductResponseDto.ProductDetail.builder()
                .productId(product.getProductId())
                .writer(writerDto)
                .uploadType(product.getUploadType().name())
                .deposit(product.getDeposit())
                .rentalFee(product.getRentalFee())
                .title(product.getTitle())
                .content(product.getContent())
                .region(regionDto)
                .rentMethod(product.getRentMethod().name())
                .videoNecessary(product.getVideoNecessary())
                .category(categoryDto)
                .rating(avgRating != null ? avgRating : product.getRating())
                .startRent(product.getStartRent())
                .endRent(product.getEndRent())
                .liked(liked)
                .files(fileDtos)
                .hashtags(hashtags)
                .rentalRefuses(refuseDtos)
                .topReviews(reviewDtos)
                .totalReviewCount(totalReviewCount)
                .reviewAverage(avgRating)
                .build();
    }

    /**
     * 상위 카테고리 이름 경로 생성:
     */
    private List<String> buildCategoryPath(Category category) {
        if (category == null) return List.of();
        if (category.getParent() == null) {
            return List.of(category.getCategoryName());
        }
        List<String> path = new ArrayList<>(buildCategoryPath(category.getParent()));
        path.add(category.getCategoryName());
        return path;
    }
}
