package com.joying.rental.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 취소 거부 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CancelRejectRequest {

    @NotBlank(message = "거부 사유는 필수입니다")
    private String rejectReason;
}
