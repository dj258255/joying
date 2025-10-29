package com.joying.category.dto.request;

public record CategoryRequestDto(
	String categoryName,
	Integer categoryLevel,
	Long parentId
) {}