package com.joying.search.dto;

import lombok.Builder;

@Builder
public record HashtagInfo(
	int count,
	Long id,
	String name) {}
