package com.joying.product.service;

import com.joying.product.dto.ProductResponseDto;

public interface ProductService {
    ProductResponseDto.ProductDetail getProductInfo(Long productId);
    ProductResponseDto.ProductDetail getProductInfo(Long productId, Long memberId);
}
