package com.joying.search.dto;

import java.util.List;

import lombok.Builder;

@Builder
public record SearchResponseDto(
	List<SearchResponse> searchResponses,
	List<HashtagInfo> hashtags,
	Long totalElements,
	Integer page,
	Integer size) {}
