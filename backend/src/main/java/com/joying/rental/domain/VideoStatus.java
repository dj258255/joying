package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum VideoStatus {
    @Comment("영상 유효")
    ALIVE("영상 유효"),
    @Comment("영상 삭제")
    DELETED("영상 삭제");

    private final String description;
}
