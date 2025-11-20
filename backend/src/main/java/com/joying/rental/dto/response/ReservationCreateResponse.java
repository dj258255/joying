package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대여 예약 생성 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationCreateResponse {

    private Long rentalHisId;
    private Long productId;
    private String status;  // PENDING
    private Integer fee;
    private Long deposit;
    private Integer totalAmount;
    private LocalDateTime startRen;
    private LocalDateTime endRen;
    private String message;
}
