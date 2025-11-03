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
    @NotNull private Long productId;
    // memberId는 보안상 클라이언트로부터 받지 않음 - 인증된 사용자 정보에서 추출
    @NotNull @Min(0) private Integer totalAmount;
    private String orderName;
}
