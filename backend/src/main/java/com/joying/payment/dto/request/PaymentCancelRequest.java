package com.joying.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentCancelRequest {
    @NotNull
    private String paymentId;
    private String reason;
}
