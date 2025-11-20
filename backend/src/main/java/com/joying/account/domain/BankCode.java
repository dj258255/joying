package com.joying.account.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BankCode {

    KAKAO("카카오뱅크"),
    TOSS("토스뱅크"),
    KB("국민은행"),
    SHINHAN("신한은행"),
    WOORI("우리은행"),
    NH("농협은행"),
    IBK("기업은행"),
    HANA("하나은행"),
    SC("SC제일은행"),
    CITY("한국씨티은행");

    private final String description;

    public static BankCode fromKorName(String name) {
        for (BankCode bank : values()) {
            if (bank.description.equals(name)) return bank;
        }
        throw new IllegalArgumentException("Unknown bank name: " + name);
    }
}
