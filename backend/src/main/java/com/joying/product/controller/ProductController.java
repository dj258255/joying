package com.joying.product.controller;

import com.joying.common.response.ApiResponse;
import com.joying.product.dto.ProductResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/products")
public class ProductController {
    private final ProductService productService;
    private final ApiResponse responseDto;

    @Operation(summary = "상품 조회", description = "물품의 상세 정보를 조회합니다.")
    @GetMapping("/{productId}")
    public ResponseEntity<?> getProductInfo(@PathVariable Long productId) {
        try {
            ProductResponseDto.ProductInfo product = productService.getProductInfo(productId);

            if (product == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.fail("상품을 찾을 수 없습니다."));
            }

            return ResponseEntity.ok(ApiResponse.success(product));

        } catch (IllegalArgumentException e) {
            // 요청 값 오류
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.fail(e.getMessage()));
        } catch (Exception e) {
            log.error("[getProductInfo] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("server error"));
        }
    }
}
