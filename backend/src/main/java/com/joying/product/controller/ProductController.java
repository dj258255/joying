package com.joying.product.controller;

import com.joying.member.domain.Member;
import com.joying.product.dto.ProductRequestDto;
import com.joying.product.dto.ProductResponseDto;
import com.joying.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import com.joying.common.exception.ErrorResponse;
import com.joying.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<?> getProductInfo(@PathVariable Long productId, Authentication authentication) {
        try {

            Long memberId = (authentication != null) ? Long.parseLong(authentication.getName()) : null;

            ProductResponseDto.ProductDetail product = productService.getProductInfo(productId, memberId);

            if (product == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ErrorResponse.of(
                                404, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다."
                        ));
            }

            return ApiResponse.ok(product);

        } catch (IllegalArgumentException e) {
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

    @Operation(summary = "상품 등록", description = "새로운 상품을 등록합니다.")
    @PostMapping
    public ResponseEntity<?> createProduct(
            @RequestBody ProductRequestDto.CreateProduct req,
            Authentication authentication
    ) {
        try {
            if (authentication.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ErrorResponse.of(
                                401,
                                "UNAUTHORIZED",
                                "로그인이 필요합니다."
                        ));
            }

            Long writerId = Long.parseLong(authentication.getName());

            Long newProductId = productService.createProduct(writerId, req);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok(
                                    "상품이 등록되었습니다.",
                                    newProductId
                    ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of(
                            400,
                            "INVALID_INPUT",
                            e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다"
                    ));
        } catch (Exception e) {
            log.error("[createProduct] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(
                            500,
                            "INTERNAL_SERVER_ERROR",
                            "server error"
                    ));
        }
    }

    @Operation(summary = "상품 수정", description = "기존 상품 정보를 수정합니다.")
    @PatchMapping("/{productId}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long productId,
            @RequestBody ProductRequestDto.CreateProduct req,
            Authentication authentication
    ) {
        try {
            if (authentication.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ErrorResponse.of(
                                401,
                                "UNAUTHORIZED",
                                "로그인이 필요합니다."
                        ));
            }

            Long memberId = Long.parseLong(authentication.getName());

            Long updatedProductId = productService.updateProduct(productId, memberId, req);

            return ResponseEntity.ok(
                    ApiResponse.ok(
                            "상품이 수정되었습니다.",
                            updatedProductId
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of(
                            400,
                            "INVALID_INPUT",
                            e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다"
                    ));
        } catch (SecurityException e) {
            // 작성자 아닌데 수정하려고 할 때
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ErrorResponse.of(
                            403,
                            "FORBIDDEN",
                            e.getMessage() != null ? e.getMessage() : "수정 권한이 없습니다."
                    ));
        } catch (Exception e) {
            log.error("[updateProduct] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(
                            500,
                            "INTERNAL_SERVER_ERROR",
                            "server error"
                    ));
        }
    }

    @Operation(summary = "상품 삭제", description = "상품을 삭제합니다.")
    @DeleteMapping("/{productId}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Long productId,
            Authentication authentication
    ) {
        try {
            if (authentication.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ErrorResponse.of(
                                401,
                                "UNAUTHORIZED",
                                "로그인이 필요합니다."
                        ));
            }

            Long memberId = Long.parseLong(authentication.getName());

            productService.deleteProduct(productId, memberId);

            return ResponseEntity.ok(
                    ApiResponse.ok(
                            "상품이 삭제되었습니다.",
                            productId
                    )
            );

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ErrorResponse.of(
                            403,
                            "FORBIDDEN",
                            e.getMessage() != null ? e.getMessage() : "삭제 권한이 없습니다."
                    ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of(
                            400,
                            "INVALID_INPUT",
                            e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다"
                    ));
        } catch (Exception e) {
            log.error("[deleteProduct] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(
                            500,
                            "INTERNAL_SERVER_ERROR",
                            "server error"
                    ));
        }
    }

}
