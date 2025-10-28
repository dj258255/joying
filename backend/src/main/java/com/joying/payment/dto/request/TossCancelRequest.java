package com.joying.payment.dto.request;

import lombok.*;

@Getter@Setter@AllArgsConstructor@NoArgsConstructor@Builder
public class TossCancelRequest {
    private String cancelReason;
}
