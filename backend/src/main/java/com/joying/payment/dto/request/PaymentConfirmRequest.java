package com.joying.payment.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentConfirmRequest {
    @NotBlank private String orderId;
    @NotBlank private String paymentKey;
    @NotNull @Min(0) private Integer amount;
}
