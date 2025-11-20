package com.joying.category.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;

import com.joying.category.domain.Category;
import com.joying.category.dto.request.CategoryRequestDto;
import com.joying.category.dto.response.CategoryResponseDto;
import com.joying.category.dto.response.ProductCategoryPathResponseDto;
import com.joying.category.repository.CategoryRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

	private final ProductRepository productRepository;
	private final CategoryRepository categoryRepository;

	public List<CategoryResponseDto> getCategoryTree(int maxDepth) {
		if (maxDepth > 2) {
			maxDepth = 2;
		}
		List<Category> all = categoryRepository.findAll();

		List<Category> roots = all.stream()
			.filter(c -> c.getParent() == null)
			.toList();

		int finalMaxDepth = maxDepth;
		return roots.stream()
			.map(root -> buildTree(root, all, 1, finalMaxDepth))
			.toList();
	}

	public List<CategoryResponseDto> getCategoriesByLevel(Integer level) {
		List<Category> categories = categoryRepository.findByCategoryLevel(level);

		return categories.stream()
			.sorted(Comparator.comparing(Category::getCategoryName))
			.map(CategoryResponseDto::from)
			.toList();
	}

	public List<CategoryResponseDto> getChildCategoriesByCategoryId(@PathVariable Long categoryId) {
		List<Category> children = categoryRepository.findByParent_CategoryId(categoryId);
		if (children.isEmpty()) {
			return List.of();
		}

		return children.stream()
			.sorted(Comparator.comparing(Category::getCategoryName))
			.map(CategoryResponseDto::from)
			.toList();
	}

	public CategoryResponseDto createCategory(CategoryRequestDto dto) {
		Category parent = null;
		if (dto.parentId() != null) {
			parent = categoryRepository.findById(dto.parentId())
				.orElseThrow(() -> new IllegalArgumentException("부모 카테고리가 존재하지 않습니다."));
		}

		Category category = Category.builder()
			.parent(parent)
			.categoryName(dto.categoryName())
			.categoryLevel(dto.categoryLevel())
			.build();

		Category saved = categoryRepository.save(category);
		return CategoryResponseDto.from(saved);
	}

	@Transactional
	public CategoryResponseDto updateCategory(Long categoryId, CategoryRequestDto dto) {
		Category category = categoryRepository.findById(categoryId)
			.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다."));

		if (dto.categoryName() != null) {
			category.updateCategoryName(dto.categoryName());
		}
		if (dto.categoryLevel() != null) {
			category.updateCategoryLevel(dto.categoryLevel());
		}

		if (dto.parentId() != null && (category.getParent() == null ||
			!category.getParent().getCategoryId().equals(dto.parentId()))) {

			Category newParent = categoryRepository.findById(dto.parentId())
				.orElseThrow(() -> new IllegalArgumentException("변경할 부모 카테고리가 존재하지 않습니다."));
			category.updateParent(newParent);
		}

		return CategoryResponseDto.from(category);
	}

	public void deleteCategory(Long categoryId) {
		Category category = categoryRepository.findById(categoryId)
			.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다."));

		List<Category> children = categoryRepository.findByParent_CategoryId(categoryId);
		if (!children.isEmpty()) {
			throw new IllegalStateException("하위 카테고리가 존재하는 경우 삭제할 수 없습니다.");
		}

		categoryRepository.delete(category);
	}

	public ProductCategoryPathResponseDto getProductCategoryPath(Long productId) {
		Product product = productRepository.findById(productId)
			.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다."));

		List<String> path = new ArrayList<>();
		Category current = product.getCategory();

		while (current != null) {
			path.add(current.getCategoryName());
			current = current.getParent();
		}

		Collections.reverse(path);

		return new ProductCategoryPathResponseDto(path);
	}

	private CategoryResponseDto buildTree(Category category, List<Category> all, int currentDepth, int maxDepth) {
		if (currentDepth >= maxDepth) {
			return new CategoryResponseDto(
				category.getCategoryId(),
				category.getCategoryName(),
				category.getCategoryLevel(),
				List.of()
			);
		}

		List<CategoryResponseDto> children = all.stream()
			.filter(c -> c.getParent() != null &&
				c.getParent().getCategoryId().equals(category.getCategoryId()))
			.map(c -> buildTree(c, all, currentDepth + 1, maxDepth))
			.toList();

		return new CategoryResponseDto(
			category.getCategoryId(),
			category.getCategoryName(),
			category.getCategoryLevel(),
			children
		);
	}
}
