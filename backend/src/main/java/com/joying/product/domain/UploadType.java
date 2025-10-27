package com.joying.product.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UploadType {

    BORROW("구해요"),
    RENT("빌려줘요");

    private final String description;
}
