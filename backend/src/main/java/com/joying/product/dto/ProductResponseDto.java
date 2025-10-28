package com.joying.product.dto;

import lombok.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Getter @Builder
@AllArgsConstructor
public class ProductResponseDto {

    @Getter @Builder @AllArgsConstructor
    public static class ProductDetail {
        private Long productId;
        private WriterDto writer;
        private String uploadType;
        private Integer deposit;
        private Integer rentalFee;
        private String title;
        private String content;

        private RegionDto region;
        private String rentMethod;
        private Boolean videoNecessary;

        private CategoryDto category;
        private Double rating;

        private Timestamp startRent;
        private Timestamp endRent;

        private Boolean liked;

        private List<FileDto> files;
        private List<String> hashtags;
        private List<RentalRefuseDto> rentalRefuses;

        private List<ReviewSummaryDto> Reviews;
        private Integer totalReviewCount;
    }

    @Getter @Builder @AllArgsConstructor
    public static class WriterDto {
        private Long memberId;
        private String name;
        private String profileImageUrl; // File 엔터티 대신 URL만
        private Double rating;
    }

    @Getter @Builder @AllArgsConstructor
    public static class RegionDto {
        private String sido;
        private String gungu;
        private String dong;
    }

    @Getter @Builder @AllArgsConstructor
    public static class CategoryDto {
        private Long categoryId;
        private String name;
        private List<String> path; // 예: ["카메라", "미러리스"]
    }

    @Getter @Builder @AllArgsConstructor
    public static class FileDto {
        private Long fileId;
        private String url;
        private Boolean thumbnail;
        private Integer sortOrder;
    }

    @Getter @Builder @AllArgsConstructor
    public static class RentalRefuseDto {
        private Timestamp startRef;
        private Timestamp endRef;
    }

    @Getter @Builder @AllArgsConstructor
    public static class ReviewSummaryDto {
        private Long reviewId;
        private String title;
        private String content;
        private float rating;
        private ReviewerDto reviewer;
    }

    @Getter @Builder @AllArgsConstructor
    public static class ReviewerDto {
        private Long memberId;
        private String name;
        private String profileImageUrl;
    }
}
