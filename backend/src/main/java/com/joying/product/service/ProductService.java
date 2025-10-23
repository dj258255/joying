package com.joying.product.service;

import com.joying.product.dto.ProductResponseDto;

public interface ProductService {
    ProductResponseDto.ProductInfo getProductInfo(Long productId);
}
