package com.joying.category.dto.response;

import java.util.List;

import com.joying.category.domain.Category;

public record CategoryResponseDto(
	Long categoryId,
	String categoryName,
	Integer categoryLevel,
	List<CategoryResponseDto> children
) {
	public static CategoryResponseDto from(Category category) {
		return new CategoryResponseDto(
			category.getCategoryId(),
			category.getCategoryName(),
			category.getCategoryLevel(),
			null
		);
	}
}