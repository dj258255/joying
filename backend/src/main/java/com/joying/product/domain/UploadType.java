package com.joying.product.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UploadType {

    request("구해요"),
    rent("빌려줘요");

    private final String description;
}
