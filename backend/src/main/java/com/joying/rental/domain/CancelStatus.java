package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum CancelStatus {
    @Comment("요청 상태")
    REQUESTED("요청 상태"),
    @Comment("승인 완료")
    BOTH_APPROVED("승인 완료"),
    @Comment("거절")
    REJECTED("거절"),
    @Comment("기간 만료")
    EXPIRED("기간 만료"),
    @Comment("취소")
    CANCELLED("취소");

    private final String description;
}
