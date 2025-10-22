package com.joying.product.controller;

import com.joying.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/products")
public class ProductController {
    private final ProductService productService;
    private final ApiResponse responseDto;

    @Operation(usmmary = "상품 조회", description = "물품의 상세 정보를 조회합니다.")
    @GetMapping("/{productId}")
    public ResponseEntity<?> getProductInfo()
}
