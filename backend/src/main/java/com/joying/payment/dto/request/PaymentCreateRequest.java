package com.joying.payment.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentCreateRequest {
    @NotNull private Long rentalHisId;
    @NotNull private Long rentalId;
    @NotNull private Long memberId;
    @NotNull @Min(0) private Integer totalAmount;
    private String orderName;
}
