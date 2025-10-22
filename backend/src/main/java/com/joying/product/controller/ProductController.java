package com.joying.product.controller;

import com.joying.product.dto.ProductResponseDto;
import com.joying.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import com.joying.common.exception.ErrorResponse;
import com.joying.common.response.ApiResponse;
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

    @Operation(summary = "상품 조회", description = "물품의 상세 정보를 조회합니다.")
    @GetMapping("/{productId}")
    public ResponseEntity<?> getProductInfo(@PathVariable Long productId) {
        try {
            ProductResponseDto.ProductInfo product = productService.getProductInfo(productId);

            if (product == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ErrorResponse.of(
                                404, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다."
                        ));
            }

            return ApiResponse.ok(product);

        } catch (IllegalArgumentException e) {
            // 파라미터 등 잘못된 요청
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of(
                            400,
                            "INVALID_INPUT",
                            e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다"
                    ));
        } catch (Exception e) {
            log.error("[getProductInfo] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(
                            500,
                            "INTERNAL_SERVER_ERROR",
                            "server error"
                    ));
        }
    }
}
