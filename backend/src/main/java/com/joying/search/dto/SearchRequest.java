package com.joying.search.dto;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

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
			// 거래 방법과 업로드 타입과 시작일은 요청에 없으면 비어 있는 채로 저장된다.
			// 종료일만 그것을 다루고 있었다. 같은 요청에서 함께 비는 값들이다
			.method(nameOrNull(product.getRentMethod()))
			.rentMethod(nameOrNull(product.getRentMethod()))
			.videoNecessary(product.getVideoNecessary())
			.startRent(Optional.ofNullable(product.getStartRent())
				.map(Timestamp::from)
				.orElse(null))
			.endRent(Optional.ofNullable(product.getEndRent())
				.map(Timestamp::from)
				.orElse(null))
			.rating(product.getRating())
			.thumbnailFileId(thumbnailFileId)
			.uploadType(nameOrNull(product.getUploadType()))
			.build();
	}

	private static String nameOrNull(Enum<?> value) {
		return value == null ? null : value.name();
	}
}