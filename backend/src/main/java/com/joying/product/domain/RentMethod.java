package com.joying.product.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RentMethod {

    both("둘 다 가능"),
    only_offline("직거래"),
    only_online("택배거래");

    private final String description;
}

