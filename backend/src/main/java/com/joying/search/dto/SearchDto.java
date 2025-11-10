package com.joying.search.dto;

import java.util.List;

import com.joying.product.domain.Product;
import com.joying.search.domain.SearchDocument;

import lombok.Builder;

@Builder
public record SearchDto(
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
	double rating,
	String thumbnailUrl,
	List<String> hashtags) {

	public static SearchDto fromEntityRDB(Product product) {
		return SearchDto.builder()
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

	public static SearchDto fromEntity(SearchDocument searchDocument, String thumbnailUrl) {
		return SearchDto.builder()
			.productId(searchDocument.getProductId())
			.title(searchDocument.getTitle())
			.content(searchDocument.getContent())
			.deposit(searchDocument.getDeposit())
			.rentalFee(searchDocument.getRentalFee())
			.sido(searchDocument.getSido())
			.gugun(searchDocument.getGugun())
			.dong(searchDocument.getDong())
			.dongId(searchDocument.getDongId())
			.categoryId(searchDocument.getCategoryId())
			.rating(searchDocument.getRating())
			.thumbnailUrl(thumbnailUrl)
			.hashtags(searchDocument.getHashtags())
			.build();
	}
}
