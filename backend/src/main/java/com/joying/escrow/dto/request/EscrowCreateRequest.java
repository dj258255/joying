package com.joying.escrow.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 에스크로 생성 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class EscrowCreateRequest {

    @NotNull(message = "대여 내역 ID는 필수입니다")
    private Long rentalHisId;

    @NotNull(message = "결제 ID는 필수입니다")
    private Long paymentId;
}
