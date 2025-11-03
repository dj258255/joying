package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발송 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipResponse {

    private Long rentalHisId;
    private String status;
    private String carrierCode;
    private String trackingNo;
    private String message;
}
