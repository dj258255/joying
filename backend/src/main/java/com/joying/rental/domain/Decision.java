package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum Decision {
    @Comment("요청 상태")
    PENDING("요청 상태"),
    @Comment("승인")
    APPROVE("승인"),
    @Comment("거절")
    REJECT("거절");

    private final String description;
}
