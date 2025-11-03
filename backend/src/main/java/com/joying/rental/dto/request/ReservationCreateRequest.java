package com.joying.rental.dto.request;

import com.joying.product.domain.RentMethod;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대여 예약 생성 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ReservationCreateRequest {

    @NotNull(message = "대여 시작 시간은 필수입니다")
    @Future(message = "대여 시작 시간은 현재보다 미래여야 합니다")
    private LocalDateTime startRen;

    @NotNull(message = "대여 종료 시간은 필수입니다")
    @Future(message = "대여 종료 시간은 현재보다 미래여야 합니다")
    private LocalDateTime endRen;

    @NotNull(message = "거래 방법은 필수입니다")
    private RentMethod rentMethod;  // ONLINE, OFFLINE
}
