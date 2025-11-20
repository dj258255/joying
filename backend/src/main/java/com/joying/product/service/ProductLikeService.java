package com.joying.product.service;

public interface ProductLikeService {
    void like(Long memberId, Long productId);
    void unlike(Long memberId, Long productId);
}
