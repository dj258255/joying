package com.joying.product.service;

import com.joying.product.dto.ProductRequestDto;
import com.joying.product.dto.ProductResponseDto;

public interface ProductService {
    ProductResponseDto.ProductDetail getProductInfo(Long productId, Long memberId);
    Long createProduct(Long memberId, ProductRequestDto.CreateProduct req);
    Long updateProduct(Long productId, Long memberId, ProductRequestDto.CreateProduct req);
    void deleteProduct(Long productId, Long memberId);
}
