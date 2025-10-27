package com.joying.product.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RentMethod {

    BOTH("둘 다 가능"),
    ONLY_OFFLINE("직거래"),
    ONLY_ONLINE("택배거래");

    private final String description;
}

