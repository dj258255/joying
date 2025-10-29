package com.joying.product.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Getter
@NoArgsConstructor
public class ProductRequestDto {

    @Getter
    @NoArgsConstructor
    public static class CreateProduct {
        private String uploadType; // Enum

        private String title;
        private String content;

        private Integer deposit;
        private Integer rentalFee;

        private String rentMethod;       // Enum
        private Boolean videoNecessary;

        private Long categoryId;
        private Long sidoId;
        private Long gunguId;
        private Long dongId;

        private Instant startRent;
        private Instant endRent;

        private List<Long> fileIds;
        private List<String> hashtags;

        private List<ProductResponseDto.RentalRefuseDto> rentalRefuses;
    }
}