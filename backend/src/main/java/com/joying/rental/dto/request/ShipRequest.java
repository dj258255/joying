package com.joying.rental.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발송 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ShipRequest {

    @NotBlank(message = "택배사 코드는 필수입니다")
    private String carrierCode;

    @NotBlank(message = "운송장 번호는 필수입니다")
    private String trackingNo;
}
