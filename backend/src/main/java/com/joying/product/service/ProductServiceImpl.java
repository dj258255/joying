package com.joying.product.service;

import com.joying.category.domain.Category;
import com.joying.category.repository.CategoryRepository;
import com.joying.file.domain.File;
import com.joying.file.domain.ProductFile;
import com.joying.file.repository.FileRepository;
import com.joying.file.repository.ProductFileRepository;
import com.joying.hashtag.domain.Hashtag;
import com.joying.hashtag.domain.HashtagHistory;
import com.joying.hashtag.repository.HashtagHistoryRepository;
import com.joying.hashtag.repository.HashtagRepository;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;
import com.joying.product.domain.RentalRefuse;
import com.joying.product.domain.UploadType;
import com.joying.product.dto.ProductRequestDto;
import com.joying.product.dto.ProductResponseDto;
import com.joying.product.repository.*;
import com.joying.region.repository.DongRepository;
import com.joying.region.repository.GunguRepository;
import com.joying.region.repository.SidoRepository;
import com.joying.review.repository.ReviewRepository;
import com.joying.region.domain.Sido;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Dong;
import com.joying.search.dto.SearchRequest;
import com.joying.search.service.SearchService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
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
    private final MemberRepository memberRepository;
    private final CategoryRepository categoryRepository;
    private final SidoRepository sidoRepository;
    private final GunguRepository gunguRepository;
    private final DongRepository dongRepository;
    private final FileRepository fileRepository;
    private final HashtagRepository hashtagRepository;
    private final SearchService searchService;

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

        // 대여불가 기간
        var refuseDtos = rentalRefuseRepository.findByProduct_ProductId(productId).stream()
                .map(r -> ProductResponseDto.RentalRefuseDto.builder()
                        .startRef(r.getStartRef())
                        .endRef(r.getEndRef())
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
                .rating(product.getRating())
                .startRent(product.getStartRent())
                .endRent(product.getEndRent())
                .liked(liked)
                .files(fileDtos)
                .hashtags(hashtags)
                .rentalRefuses(refuseDtos)
                .Reviews(reviewDtos)
                .totalReviewCount(totalReviewCount)
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

    @Override
    @Transactional
    public Long createProduct(Long memberId, ProductRequestDto.CreateProduct req) {

        //작성자
        Member writer = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        //카테고리
        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 카테고리입니다."));
        }

        // 3) 지역
        Sido sido = null;
        if (req.getSidoId() != null) {
            sido = sidoRepository.findById(req.getSidoId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 시/도입니다."));
        }

        Gungu gungu = null;
        if (req.getGunguId() != null) {
            gungu = gunguRepository.findById(req.getGunguId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 군/구입니다."));
        }

        Dong dong = null;
        if (req.getDongId() != null) {
            dong = dongRepository.findById(req.getDongId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 동입니다."));
        }

        // Enum 매핑
        UploadType uploadType = null;
        if (req.getUploadType() != null) {
            try {
                uploadType = UploadType.valueOf(req.getUploadType().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("유효하지 않은 uploadType 입니다.");
            }
        }

        RentMethod rentMethod = null;
        if (req.getRentMethod() != null) {
            try {
                rentMethod = RentMethod.valueOf(req.getRentMethod().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("유효하지 않은 rentMethod 입니다.");
            }
        }

        // Product 생성 & 저장
        Product product = Product.builder()
                .writer(writer)
                .uploadType(uploadType)
                .deposit(req.getDeposit())
                .rentalFee(req.getRentalFee())
                .title(req.getTitle())
                .content(req.getContent())
                .sido(sido)
                .gungu(gungu)
                .dong(dong)
                .rentMethod(rentMethod)
                .videoNecessary(req.getVideoNecessary())
                .category(category)
                .startRent(req.getStartRent())
                .endRent(req.getEndRent())
                .rating(0.0) // 기본 평점
                .build();

        Product saved = productRepository.save(product);

        // rentalRefuses
        if (req.getRentalRefuses() != null && !req.getRentalRefuses().isEmpty()) {
            for (ProductResponseDto.RentalRefuseDto r : req.getRentalRefuses()) {
                RentalRefuse entity = RentalRefuse.builder()
                        .product(saved)
                        .startRef(r.getStartRef())
                        .endRef(r.getEndRef())
                        .build();
                rentalRefuseRepository.save(entity);
            }
        }

        // 파일 연결
        Long thumbnailFileId = null;
        if (req.getFileIds() != null && !req.getFileIds().isEmpty()) {
            var files = fileRepository.findAllById(req.getFileIds());
            int order = 0;
            thumbnailFileId = files.get(0).getFileId();
            for (File f : files) {
                ProductFile pf = ProductFile.builder()
                        .product(saved)
                        .file(f)
                        .isThumbnail(order == 0) // 첫 번째 이미지 썸네일
                        .sortOrder(order)
                        .build();

                productFileRepository.save(pf);
                order++;
            }
        }

        // 해시태그
        if (req.getHashtags() != null && !req.getHashtags().isEmpty()) {
            for (String tagName : req.getHashtags()) {
                if (tagName == null || tagName.isBlank()) continue;

                Hashtag tag = hashtagRepository.findByHashtagName(tagName)
                        .orElse(null);

                if (tag == null) {
                    Hashtag newTag = Hashtag.builder()
                            .hashtagName(tagName)
                            .category(category)
                            .build();

                    tag = hashtagRepository.save(newTag);
                }

                // HashtagHistory 로 product와 연결
                HashtagHistory history = HashtagHistory.builder()
                        .product(saved)
                        .hashtag(tag)
                        .build();

                hashtagHistoryRepository.save(history);
            }
        }

        searchService.save(SearchRequest.ofProduct(
            saved,
            req.getHashtags(),
            thumbnailFileId,
            sido.getName(),
            gungu.getName(),
            dong.getName(),
            dong.getDongId(),
            category.getCategoryId()));

        return saved.getProductId();
    }

    @Override
    @Transactional
    public Long updateProduct(Long productId, Long memberId, ProductRequestDto.CreateProduct req) {

        // 1. 기존 상품 조회
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."));

        // 2. 권한 체크 (작성자만 수정 가능)
        if (!product.getWriter().getMemberId().equals(memberId)) {
            throw new SecurityException("해당 상품을 수정할 권한이 없습니다.");
        }

        UploadType uploadType = null;
        if (req.getUploadType() != null) {
            try {
                uploadType = UploadType.valueOf(req.getUploadType().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("유효하지 않은 uploadType 입니다.");
            }
        }

        RentMethod rentMethod = null;
        if (req.getRentMethod() != null) {
            try {
                rentMethod = RentMethod.valueOf(req.getRentMethod().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("유효하지 않은 rentMethod 입니다.");
            }
        }

        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 카테고리입니다."));
        }

        Sido sido = null;
        if (req.getSidoId() != null) {
            sido = sidoRepository.findById(req.getSidoId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 시/도입니다."));
        }

        Gungu gungu = null;
        if (req.getGunguId() != null) {
            gungu = gunguRepository.findById(req.getGunguId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 군/구입니다."));
        }

        Dong dong = null;
        if (req.getDongId() != null) {
            dong = dongRepository.findById(req.getDongId())
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 동입니다."));
        }

        product.updateProductInfo(
                req.getTitle(),
                req.getContent(),
                req.getDeposit(),
                req.getRentalFee(),
                uploadType,
                rentMethod,
                req.getVideoNecessary(),
                category,
                sido,
                gungu,
                dong,
                req.getStartRent(),
                req.getEndRent()
        );

        if (req.getRentalRefuses() != null) {
            rentalRefuseRepository.deleteByProduct_ProductId(productId);

            for (ProductResponseDto.RentalRefuseDto r : req.getRentalRefuses()) {
                RentalRefuse entity = RentalRefuse.builder()
                        .product(product)
                        .startRef(r.getStartRef())
                        .endRef(r.getEndRef())
                        .build();
                rentalRefuseRepository.save(entity);
            }
        }

        if (req.getFileIds() != null) {
            productFileRepository.deleteByProduct_ProductId(productId);

            var files = fileRepository.findAllById(req.getFileIds());
            int order = 0;
            for (File f : files) {
                ProductFile pf = ProductFile.builder()
                        .product(product)
                        .file(f)
                        .isThumbnail(order == 0)
                        .sortOrder(order)
                        .build();
                productFileRepository.save(pf);
                order++;
            }
        }

        if (req.getHashtags() != null) {
            hashtagHistoryRepository.deleteByProduct_ProductId(productId);

            for (String tagName : req.getHashtags()) {
                if (tagName == null || tagName.isBlank()) continue;

                Hashtag tag = hashtagRepository.findByHashtagName(tagName)
                        .orElseGet(() -> {
                            Hashtag newTag = Hashtag.builder()
                                    .hashtagName(tagName)
                                    .build();
                            return hashtagRepository.save(newTag);
                        });

                HashtagHistory history = HashtagHistory.builder()
                        .product(product)
                        .hashtag(tag)
                        .build();

                hashtagHistoryRepository.save(history);
            }
        }

        return product.getProductId();
    }

    @Override
    @Transactional
    public void deleteProduct(Long productId, Long memberId) {

        // 상품 조회
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."));

        // 권한 체크
        if (!product.getWriter().getMemberId().equals(memberId)) {
            throw new SecurityException("해당 상품을 삭제할 권한이 없습니다.");
        }

        // 찜삭제
        productLikeRepository.deleteByProduct_ProductId(productId);

        // 대여 불가 기간 삭제
        rentalRefuseRepository.deleteByProduct_ProductId(productId);

        // 상품-파일 매핑 삭제
        productFileRepository.deleteByProduct_ProductId(productId);

        // 해시태그 히스토리 삭제
        hashtagHistoryRepository.deleteByProduct_ProductId(productId);

        // 상품 자체 삭제
        productRepository.delete(product);

    }

    @Override
    public Page<ProductResponseDto.ProductListItem> getMyItems(Long memberId, Pageable pageable) {
        Page<Product> page = productRepository.findByWriter_MemberId(memberId, pageable);
        return page.map(p -> toListItem(p, false, memberId));
    }

    @Override
    public Page<ProductResponseDto.ProductListItem> getMemberItems(Long memberId, Pageable pageable) {
        Page<Product> page = productRepository.findByWriter_MemberId(memberId, pageable);
        return page.map(p -> toListItem(p, false, memberId));
    }

    @Override
    public Page<ProductResponseDto.ProductListItem> getMyLikes(Long memberId, Pageable pageable) {
        Page<Product> page = productLikeRepository.findLikedProductsByMemberId(memberId, pageable);
        return page.map(p -> toListItem(p, /*likedPrefetched*/ true, memberId));
    }

    private ProductResponseDto.ProductListItem toListItem(Product p, boolean likedPrefetched, Long memberId) {
        // 썸네일
        String thumbUrl = productFileRepository
                .findFirstByProduct_ProductIdAndIsThumbnailTrueOrderBySortOrderAsc(p.getProductId())
                .map(pf -> fileUrlResolver.toPublicUrl(pf.getFile()))
                .orElse(null);

        // 지역 DTO
        ProductResponseDto.RegionDto regionDto = ProductResponseDto.RegionDto.builder()
                .sido(p.getSido() != null ? p.getSido().getName() : null)
                .gungu(p.getGungu() != null ? p.getGungu().getName() : null)
                .dong(p.getDong() != null ? p.getDong().getName() : null)
                .build();

        // liked (myitems는 별도 조회 필요)
        boolean liked = likedPrefetched;
        if (!likedPrefetched && memberId != null) {
            liked = productLikeRepository.existsByProduct_ProductIdAndMember_MemberId(p.getProductId(), memberId);
        }

        return ProductResponseDto.ProductListItem.builder()
                .productId(p.getProductId())
                .title(p.getTitle())
                .rentalFee(p.getRentalFee())
                .deposit(p.getDeposit())
                .rating(p.getRating())
                .region(regionDto)
                .thumbnailUrl(thumbUrl)
                .liked(liked)
                .uploadType(p.getUploadType() != null ? p.getUploadType().name() : null)
                .build();
    }
}
