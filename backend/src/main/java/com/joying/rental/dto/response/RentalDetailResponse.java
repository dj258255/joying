package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 거래 상세 조회 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalDetailResponse {

    private Long rentalHisId;
    private ProductInfo product;
    private MemberInfo renter;
    private MemberInfo owner;
    private String status;
    private String rentMethod;
    private Integer fee;
    private Long deposit;
    private LocalDateTime startRen;
    private LocalDateTime endRen;
    private Integer extensionCount;
    private ShippingInfo outbound;
    private ShippingInfo returnShipping;
    private List<VideoInfo> videos;
    private EscrowInfo escrow;
    private PaymentInfo payment;
    private CancelRequestInfo cancelRequest;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductInfo {
        private Long productId;
        private String title;
        private String thumbnail;
        private List<String> images;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Long memberId;
        private String name;
        private Double rating;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShippingInfo {
        private String carrierCode;
        private String carrierName;
        private String trackingNo;
        private String status;
        private LocalDateTime shippedAt;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VideoInfo {
        private Long videoId;
        private String videoType;
        private String fileUrl;
        private LocalDateTime uploadedAt;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EscrowInfo {
        private Long holdId;
        private String status;
        private Integer rentalFee;
        private Integer depositAmount;
        private Integer totalAmount;
        private LocalDateTime rentalFeeReleasedAt;
        private LocalDateTime depositReturnedAt;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentInfo {
        private Long paymentId;
        private String orderId;
        private String status;
        private Integer totalAmount;
        private LocalDateTime approvedAt;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancelRequestInfo {
        private Long cancelId;
        private String status;
        private String reason;
        private Integer depositOwnerAmt;
        private Integer depositRenterAmt;
        private LocalDateTime expiresAt;
    }
}
