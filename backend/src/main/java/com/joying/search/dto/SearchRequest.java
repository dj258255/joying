package com.joying.search.dto;

import java.sql.Timestamp;
import java.util.List;

import com.joying.product.domain.Product;

import lombok.Builder;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
public record SearchRequest(
	Long rentalId,
	String title,
	String content,
	Long categoryId,
	List<String> hashtags,
	Integer rentalFee,
	String sido,
	Long sidoId,
	String gugun,
	Long gugunId,
	String dong,
	Long dongId,
	String method,
	Integer deposit,
	String rentMethod,
	Boolean videoNecessary,
	Timestamp startRent,
	Timestamp endRent,
	Double rating,
	Long thumbnailFileId,
	String uploadType) {
	public static SearchRequest ofProduct(
		Product product,
		List<String> hashtags,
		Long thumbnailFileId,
		String sido,
		Long sidoId,
		String gungu,
		Long gunguId,
		String dong,
		Long dongId,
		Long categoryId) {
		return SearchRequest.builder()
			.rentalId(product.getProductId())
			.title(product.getTitle())
			.content(product.getContent())
			.categoryId(categoryId)
			.hashtags(hashtags)
			.rentalFee(product.getRentalFee())
			.deposit(product.getDeposit())
			.sido(sido)
			.sidoId(sidoId)
			.gugun(gungu)
			.gugunId(gunguId)
			.dong(dong)
			.dongId(dongId)
			.method(product.getRentMethod().name())
			.rentMethod(product.getRentMethod().name())
			.videoNecessary(product.getVideoNecessary())
			.startRent(Timestamp.from(product.getStartRent()))
			.endRent(Timestamp.from(product.getEndRent()))
			.rating(product.getRating())
			.thumbnailFileId(thumbnailFileId)
			.uploadType(product.getUploadType().name())
			.build();
	}
}