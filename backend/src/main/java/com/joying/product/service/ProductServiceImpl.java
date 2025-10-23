package com.joying.product.service;

import com.joying.product.domain.Product;
import com.joying.product.dto.ProductResponseDto;
import com.joying.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    public ProductResponseDto.ProductInfo getProductInfo(Long productId) {
        Optional<Product> product = productRepository.findByProductId(productId);
        return null;
    }
}
