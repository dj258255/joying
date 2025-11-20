package com.joying.common.dto;

import java.util.List;

import lombok.Builder;

@Builder
public record PagedResponse<T> (
	List<T> data,
	 Long totalCount,
	 Integer page,
	 Integer size) {
}
