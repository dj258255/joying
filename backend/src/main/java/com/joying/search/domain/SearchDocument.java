package com.joying.search.domain;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Alias;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Mapping;
import org.springframework.data.elasticsearch.annotations.Setting;

import com.joying.search.dto.SearchRequest;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Getter
@Document(indexName = "search_product")
@Setting(settingPath = "elasticsearch/search-setting.json")
@Mapping(mappingPath = "elasticsearch/search-mapping.json")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Alias("search_product")
public class SearchDocument {
	@Id
	private Long productId;

	@Field(type = FieldType.Text)
	private String title;

	@Field(type = FieldType.Text)
	private String content;

	@Field(type = FieldType.Long)
	private Long categoryId;

	@Field(type = FieldType.Keyword)
	private List<String> hashtags;

	@Field(type = FieldType.Integer)
	private Integer deposit;

	@Field(type = FieldType.Integer)
	private Integer rentalFee;

	@Field(type = FieldType.Keyword)
	private String sido;

	@Field(type = FieldType.Keyword)
	private String gugun;

	@Field(type = FieldType.Keyword)
	private String dong;

	@Field(type = FieldType.Integer)
	private Long dongId;

	@Field(type = FieldType.Keyword)
	private String rentMethod;

	@Field(type = FieldType.Boolean)
	private Boolean videoNecessary;

	@Field(type = FieldType.Date, format = {}, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS||epoch_millis")
	private LocalDateTime startRent;

	@Field(type = FieldType.Date, format = {}, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS||epoch_millis")
	private LocalDateTime endRent;

	@Field(type = FieldType.Double)
	private Double rating;

	@Field(type = FieldType.Long)
	private Long thumbnailFileId;

	@Builder
	public SearchDocument(
		Long productId,
		String title,
		String content,
		Integer deposit,
		Integer rentalFee,
		String rentMethod,
		Boolean videoNecessary,
		Long categoryId,
		String sido,
		String gugun,
		String dong,
		Long dongId,
		LocalDateTime startRent,
		LocalDateTime endRent,
		List<String> hashtags,
		Double rating,
		Long thumbnailFileId) {
		this.productId = productId;
		this.title = title;
		this.content = content;
		this.categoryId = categoryId;
		this.hashtags = hashtags;
		this.rentalFee = rentalFee;
		this.sido = sido;
		this.gugun = gugun;
		this.dong = dong;
		this.dongId = dongId;
		this.deposit = deposit;
		this.rentMethod = rentMethod;
		this.videoNecessary = videoNecessary;
		this.startRent = startRent;
		this.endRent = endRent;
		this.rating = rating;
		this.thumbnailFileId = thumbnailFileId;
	}

	public static SearchDocument from(SearchRequest searchRequest) {
		return SearchDocument.builder()
			.productId(searchRequest.rentalId())
			.title(searchRequest.title())
			.content(searchRequest.content())
			.categoryId(searchRequest.categoryId())
			.sido(searchRequest.sido())
			.gugun(searchRequest.gugun())
			.dong(searchRequest.dong())
			.hashtags(searchRequest.hashtags())
			.rentalFee(searchRequest.rentalFee())
			.dongId(searchRequest.dongId())
			.deposit(searchRequest.deposit())
			.rentMethod(searchRequest.rentMethod())
			.videoNecessary(searchRequest.videoNecessary())
			.startRent(searchRequest.startRent().toLocalDateTime())
			.endRent(searchRequest.endRent().toLocalDateTime())
			.rating(searchRequest.rating())
			.build();
	}
}