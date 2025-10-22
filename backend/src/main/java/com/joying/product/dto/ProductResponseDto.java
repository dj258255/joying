package com.joying.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

public class ProductResponseDto {

    @Builder
    @Getter
    @AllArgsConstructor
    public static class ProductInfo {
        private Long accountId;
        private String bankName;
        private String accountName;
        private String accountNo;
        private boolean isMain;
    }

}
