package com.joying.payment.dto.response;

import lombok.*;

@Getter@Setter@NoArgsConstructor@AllArgsConstructor@Builder
public class TossPaymentDetailResponse {
    private String paymentKey;
    private String orderId;
    private String status;
    private String method;
    private String approvedAt;
    private String receiptUrl;
}
