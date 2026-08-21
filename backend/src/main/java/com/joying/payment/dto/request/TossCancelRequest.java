package com.joying.payment.dto.request;

import lombok.*;

import com.fasterxml.jackson.annotation.JsonInclude;

@Getter@Setter@AllArgsConstructor@NoArgsConstructor@Builder
public class TossCancelRequest {

    private String cancelReason;

    /**
     * 취소할 금액. 비워 두면 전액 취소다.
     *
     * <p>보증금만 풀 때처럼 결제 일부만 되돌려야 하는 경우에 쓴다.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer cancelAmount;

    public TossCancelRequest(String cancelReason) {
        this.cancelReason = cancelReason;
    }
}
