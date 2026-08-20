package com.joying.payment.dto.response;

import lombok.*;

@Getter@Setter@NoArgsConstructor@AllArgsConstructor@Builder
public class TossConfirmResponse {
    private String paymentKey;
    private String orderId;
    private String status;
    private String method;
    private String approvedAt;
    private String receiptUrl;

    /**
     * 결제 총액.
     */
    private Long totalAmount;

    /**
     * 아직 취소되지 않고 남아 있는 금액.
     *
     * <p>부분취소가 카드사에 반영되면 이 값이 그만큼 줄어든다. 취소를 요청한 것과
     * 실제로 반영된 것을 가르는 근거가 이 값이다.
     */
    private Long balanceAmount;
}
