package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

/**
 * 취소 요청 상태
 */
@Getter
@RequiredArgsConstructor
public enum CancelStatus {
    @Comment("대기 중")
    PENDING("대기 중"),
    @Comment("승인됨")
    APPROVED("승인됨"),
    @Comment("거부됨")
    REJECTED("거부됨");

    private final String description;
}
