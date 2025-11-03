package com.joying.payment.dto.request;

import lombok.*;

/**
 * 토스 페이먼츠 웹훅 요청 DTO
 * - 결제 성공/실패/부정사용 등의 이벤트 수신
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentWebhookRequest {
    private String eventType;       // "PAYMENT_STATUS_CHANGED" 등
    private String createdAt;        // 이벤트 발생 시각
    private WebhookData data;        // 결제 데이터

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WebhookData {
        private String paymentKey;
        private String orderId;
        private String status;       // "DONE", "CANCELED", "ABORTED" 등
        private String method;
        private Integer totalAmount;
        private String approvedAt;
        private String receiptUrl;
    }
}
