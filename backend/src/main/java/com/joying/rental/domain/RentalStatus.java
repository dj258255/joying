package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum RentalStatus {
    @Comment("결제 대기")
    PENDING("결제 대기"),
    @Comment("보증금 보관")
    ESCROW("보증금 보관"),
    @Comment("발송 완료")
    SHIPPED("발송 완료"),
    @Comment("대여 중")
    RENTING("대여 중"),
    @Comment("반납 요청")
    RETURN_REQUESTED("반납 요청"),
    @Comment("회수 완료")
    RETURNED("회수 완료"),
    @Comment("거래 취소")
    CANCELLED("거래 취소"),
    @Comment("거래 완료")
    DEPOSIT_RETURNED("거래 완료");

    private final String description;
}
