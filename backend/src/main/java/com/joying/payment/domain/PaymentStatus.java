package com.joying.payment.domain;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum PaymentStatus {
    @Comment("준비")
    READY("준비"),
    @Comment("완료")
    DONE("완료"),
    @Comment("취소")
    CANCELED("취소"),
    @Comment("실패")
    FAILED("실패");
    private final String description;
}
