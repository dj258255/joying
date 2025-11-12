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
    // @Future → @FutureOrPresent로 변경: 오늘 날짜도 허용
    private LocalDateTime startRen;

    @NotNull(message = "대여 종료 시간은 필수입니다")
    private LocalDateTime endRen;

    @NotNull(message = "거래 방법은 필수입니다")
    private RentMethod rentMethod;  // ONLINE, OFFLINE

    /**
     * 대여자(구매자) ID
     * - 판매자가 구매자를 위해 거래를 생성하는 경우 전달
     * - 없으면 현재 요청한 사용자가 대여자가 됨
     */
    private Long renterId;

    /**
     * 1일 대여료 (optional)
     * - 없으면 상품의 기본 rentalFee 사용
     * - 할인 등으로 금액 조정 시 사용
     */
    private Integer fee;

    /**
     * 보증금 (optional)
     * - 없으면 상품의 기본 deposit 사용
     * - 할인 등으로 금액 조정 시 사용
     */
    private Long deposit;
}
