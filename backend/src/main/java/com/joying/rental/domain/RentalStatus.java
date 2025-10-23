package com.joying.rental.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@RequiredArgsConstructor
public enum RentalStatus {
    @Comment("보증금 보관")
    ESCROW("보증금 보관"),
    @Comment("거래 취소")
    CANCLLED("거래 취소"),
    @Comment("거래 완료")
    DEPOSIT_RETURNED("거래 완료");

    private final String description;
}
