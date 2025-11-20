package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum VideoType {
    @Comment("대여자 발송 영상")
    OWNER_SEND("대여자 발송 영상"),
    @Comment("빌리는 사람 수령 영상")
    RENTER_RECEIVE("빌리는 사람 수령 영상"),
    @Comment("빌리는 사람 반납 영상")
    RENTER_RETURN("빌리는 사람 반납 영상"),
    @Comment("대여자 수령(회수) 영상")
    OWNER_RECEIVE("대여자 수령(회수) 영상");

    private final String description;
}
