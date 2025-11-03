package com.joying.search.dto;

import com.joying.product.domain.Product;

import lombok.Builder;

@Builder
public record SearchResponse(
	Long productId,
	String title,
	String content,
	int deposit,
	int rentalFee,
	String sido,
	String gugun,
	String dong,
	Long dongId,
	String category,
	Long categoryId,
	double rating) {

	public static SearchResponse fromEntity(Product product) {
		return SearchResponse.builder()
			.productId(product.getProductId())
			.title(product.getTitle())
			.content(product.getContent())
			.deposit(product.getDeposit())
			.rentalFee(product.getRentalFee())
			.sido(product.getSido().getName())
			.gugun(product.getGungu().getName())
			.dong(product.getDong().getName())
			.dongId(product.getDong().getDongId())
			.category(product.getCategory() == null ? null : product.getCategory().getCategoryName())
			.categoryId(product.getCategory() == null ? null : product.getCategory().getCategoryId())
			.rating(product.getRating())
			.build();
	}
}
