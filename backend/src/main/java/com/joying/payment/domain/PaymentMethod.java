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
    EASY_PAY("간편 결제"),
    @Comment("상품권")
    GIFT_CERTIFICATE("상품권");

    private final String description;

    /**
     * 토스 페이먼츠 API에서 반환하는 method 값을 PaymentMethod enum으로 변환
     * @param tossMethod 토스 API method 값 (예: "카드", "간편결제", "가상계좌" 등)
     * @return PaymentMethod enum
     */
    public static PaymentMethod fromTossMethod(String tossMethod) {
        if (tossMethod == null) {
            throw new IllegalArgumentException("결제 수단이 null입니다.");
        }

        // 토스 API 반환값 매핑
        switch (tossMethod) {
            case "카드":
                return CARD;
            case "가상계좌":
                return VIRTUAL_ACCOUNT;
            case "계좌이체":
                return TRANSFER;
            case "휴대폰":
            case "핸드폰":
                return MOBILE_PHONE;
            case "간편결제":
                return EASY_PAY;
            case "상품권":
                return GIFT_CERTIFICATE;
            default:
                throw new IllegalArgumentException("지원하지 않는 결제 수단입니다: " + tossMethod);
        }
    }
}
