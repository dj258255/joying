package com.joying.escrow.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum Status {
    @Comment("홀드 대기")
    PENDING("홀드 대기"),

    @Comment("홀드 완료(예치중)")
    HELD("홀드 완료(예치중)"),

    @Comment("대여시작(수령확정)")
    RENTAL_STARTED("대여시작(수령확정)"),

    @Comment("반납 시작")
    RETURN_STARTED("반납 시작"),

    @Comment("정산 완료")
    SETTLED("정산 완료"),

    @Comment("전액 환불")
    REFUNDED("전액 환불"),

    @Comment("취소")
    CANCELLED("취소");

    private final String description;
}
