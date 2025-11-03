package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 수령 확인 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmReceiveResponse {

    private Long rentalHisId;
    private String status;
    private LocalDateTime startRen;
    private LocalDateTime endRen;
    private String message;
}
