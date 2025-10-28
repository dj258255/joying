package com.joying.payment.dto.request;

import lombok.*;

@Getter
@Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossConfirmRequest {
    private String paymentKey;
    private String orderId;
    private int amount;
}
