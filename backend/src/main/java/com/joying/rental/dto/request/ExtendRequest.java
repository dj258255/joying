package com.joying.rental.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대여 기간 연장 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ExtendRequest {

    @NotNull(message = "연장 종료일은 필수입니다")
    private LocalDateTime newEndRen;

    @NotNull(message = "추가 대여료는 필수입니다")
    private Integer additionalFee;
}
