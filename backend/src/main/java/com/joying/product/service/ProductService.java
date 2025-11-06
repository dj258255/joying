package com.joying.product.service;

import com.joying.product.dto.ProductRequestDto;
import com.joying.product.dto.ProductResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductService {
    ProductResponseDto.ProductDetail getProductInfo(Long productId, Long memberId);
    Long createProduct(Long memberId, ProductRequestDto.CreateProduct req);
    Long updateProduct(Long productId, Long memberId, ProductRequestDto.CreateProduct req);
    void deleteProduct(Long productId, Long memberId);
    Page<ProductResponseDto.ProductListItem> getMyItems(Long memberId, Pageable pageable);
    Page<ProductResponseDto.ProductListItem> getMyLikes(Long memberId, Pageable pageable);
}
