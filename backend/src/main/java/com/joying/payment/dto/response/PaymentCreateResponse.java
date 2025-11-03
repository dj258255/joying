package com.joying.payment.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor
@AllArgsConstructor @Builder
public class PaymentCreateResponse {
    private Long paymentId;
    private String orderId;
    private Integer totalAmount;
}
