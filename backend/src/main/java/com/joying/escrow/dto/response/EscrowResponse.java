package com.joying.escrow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 에스크로 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EscrowResponse {

    private Long holdId;
    private Long rentalHisId;
    private Long paymentId;
    private String status;
    private Integer rentalFee;
    private Integer depositAmount;
    private Integer totalAmount;
    private LocalDateTime rentalFeeReleasedAt;
    private LocalDateTime depositReturnedAt;
}
