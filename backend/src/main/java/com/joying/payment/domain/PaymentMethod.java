package com.joying.payment.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum PaymentMethod {
    @Comment("카드")
    CARD("카드"),
    @Comment("가상계좌")
    VIRTUAL_ACCOUNT("가상계좌"),
    @Comment("계좌이체")
    TRANSFER("계좌이체"),
    @Comment("핸드폰 소액결제")
    MOBILE_PHONE("핸드폰 소액결제"),
    @Comment("간편 결제")
    EASY_PAY("간편 결제");

    private final String description;
}
