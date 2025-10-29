package com.joying.category.controller;

import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.util.Objects;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.category.dto.request.CategoryRequestDto;
import com.joying.category.dto.response.CategoryResponseDto;
import com.joying.category.dto.response.ProductCategoryPathResponseDto;
import com.joying.category.service.CategoryService;
import com.joying.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/category")
public class CategoryController {

	private final CategoryService categoryService;
	private final Long MANAGERID = 1L;

	@GetMapping
	public ResponseEntity<ApiResponse.SuccessBody<List<CategoryResponseDto>>> getCategories(
		@RequestParam(required = false, defaultValue = "2") Integer maxDepth) {
		return ApiResponse.ok(categoryService.getCategoryTree(maxDepth));
	}

	@GetMapping("/level")
	public ResponseEntity<?> getCategoriesByLevel(@RequestParam(defaultValue = "1") Integer level) {
		return ApiResponse.ok(categoryService.getCategoriesByLevel(level));
	}

	@GetMapping("/{categoryId}")
	public ResponseEntity<?> getChildCategoriesByCategoryId(@PathVariable Long categoryId) {
		return ApiResponse.ok(categoryService.getChildCategoriesByCategoryId(categoryId));
	}

	@PostMapping
	public ResponseEntity<?> createCategory(
		@RequestBody CategoryRequestDto categoryRequestDto,
		Authentication authentication) {
		Long currentMemberId = Long.parseLong(authentication.getName());
		checkAdmin(currentMemberId);
		return ApiResponse.created(categoryService.createCategory(categoryRequestDto));
	}

	@PatchMapping("/{categoryId}")
	public ResponseEntity<?> updateCategory(
		@PathVariable Long categoryId,
		@RequestBody CategoryRequestDto categoryRequestDto,
		Authentication authentication) {
		Long currentMemberId = Long.parseLong(authentication.getName());
		checkAdmin(currentMemberId);
		return ApiResponse.ok("카테고리를 수정했습니다", categoryService.updateCategory(categoryId, categoryRequestDto));
	}

	@DeleteMapping("/{categoryId}")
	public ResponseEntity<?> deleteCategory(
		@PathVariable Long categoryId,
		Authentication authentication) {
		Long currentMemberId = Long.parseLong(authentication.getName());
		checkAdmin(currentMemberId);
		categoryService.deleteCategory(categoryId);
		return ApiResponse.noContent();
	}

	@GetMapping("/product/{productId}/category-path")
	public ResponseEntity<ApiResponse.SuccessBody<ProductCategoryPathResponseDto>> getCategoryPath(
		@PathVariable Long productId
	) {
		return ApiResponse.ok("상품 카테고리 경로 조회 성공", categoryService.getProductCategoryPath(productId));
	}

	private void checkAdmin(Long managerId) {
		if (!Objects.equals(managerId, MANAGERID)) {
			throw new AccessDeniedException("관리자만 접근할 수 있습니다.");
		}
	}
}
