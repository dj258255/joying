package com.joying.payment.dto.response;

import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {
    private Long paymentId;
    private String orderId;
    private String paymentKey;
    private String status;
    private String method;
    private Integer totalAmount;
    private String receiptUrl;
    private String approvedAt;
}
