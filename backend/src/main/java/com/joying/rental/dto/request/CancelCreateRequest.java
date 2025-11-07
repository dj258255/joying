package com.joying.rental.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 거래 취소 요청 생성 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CancelCreateRequest {

    @NotBlank(message = "취소 사유는 필수입니다")
    private String reason;

    @NotNull(message = "보증금 소유자 몫은 필수입니다")
    private Integer depositOwnerAmt;

    @NotNull(message = "보증금 대여자 몫은 필수입니다")
    private Integer depositRenterAmt;
}
