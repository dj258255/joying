package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대여 기간 연장 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtendResponse {

    private Long rentalHisId;
    private String status;
    private LocalDateTime originalEndRen;
    private LocalDateTime newEndRen;
    private Integer originalFee;
    private Integer additionalFee;
    private Integer totalFee;
    private Integer extensionCount;
    private String message;
}
