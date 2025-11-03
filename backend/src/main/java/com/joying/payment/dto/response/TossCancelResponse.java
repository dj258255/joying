package com.joying.payment.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossCancelResponse {
    private String paymentKey;
    private String orderId;
    private String status;
}
