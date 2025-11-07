package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대여 내역 리스트 조회용 응답 DTO (경량화)
 * - 성능 최적화를 위해 리스트 조회 시 필요한 최소한의 정보만 포함
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalHistoryListResponse {

    // 대여 기본 정보
    private Long rentalHisId;
    private String status;
    private String rentMethod;
    private Integer fee;
    private Long deposit;
    private LocalDateTime startRen;
    private LocalDateTime endRen;
    private Integer extensionCount;

    // 상품 정보 (간략)
    private ProductSummary product;

    // 거래 상대방 정보
    private MemberSummary counterparty;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductSummary {
        private Long productId;
        private String title;
        private String thumbnail;
        private String category;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberSummary {
        private Long memberId;
        private String name;
        private String profileImage;
        private Double rating;
    }
}
