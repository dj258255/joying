package com.joying.hashtag.dto;

import com.joying.hashtag.domain.Hashtag;

import lombok.Builder;

@Builder
public record HashtagResponseDto(
	Long hashTagId,
	String hashtagName) {
	public static HashtagResponseDto fromEntity(Hashtag hashtag) {
		return HashtagResponseDto.builder()
			.hashTagId(hashtag.getHashtagId())
			.hashtagName(hashtag.getHashtagName())
			.build();
	}
}
