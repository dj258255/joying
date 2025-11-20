package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 거래 취소 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelResponse {

    private Long cancelId;
    private Long rentalHisId;
    private Long proposerId;
    private String proposerName;
    private String reason;
    private Integer depositOwnerAmt;
    private Integer depositRenterAmt;
    private String status;
    private String ownerDecision;
    private String renterDecision;
    private LocalDateTime ownerDecidedAt;
    private LocalDateTime renterDecidedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private String message;
}
