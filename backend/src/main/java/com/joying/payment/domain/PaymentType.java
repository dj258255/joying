package com.joying.payment.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum PaymentType {
    @Comment("최초 결제")
    INITIAL("최초 결제"),

    @Comment("연장 결제")
    EXTENSION("연장 결제");

    private final String description;
}
