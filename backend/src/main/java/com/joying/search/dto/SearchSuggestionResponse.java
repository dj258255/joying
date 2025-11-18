package com.joying.search.dto;

import com.joying.search.domain.SearchDocument;

import lombok.Builder;

@Builder
public record SearchSuggestionResponse(
	String title,
	String url,
	Long productId) {

	public static SearchSuggestionResponse fromDocument(SearchDocument document, String url) {
		return SearchSuggestionResponse.builder()
			.title(document.getTitle())
			.url(url)
			.productId(document.getProductId())
			.build();
	}
}
