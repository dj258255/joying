package com.joying.hashtag.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.common.dto.PagedResponse;
import com.joying.common.response.ApiResponse;
import com.joying.hashtag.dto.HashtagResponseDto;
import com.joying.hashtag.service.HashtagService;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hashtag")
public class HashtagController {

	private final HashtagService hashtagService;

	@Operation(summary = "해시태그 조회", description = "해시태그 전체를 조회합니다.(페이지네이션)")
	@GetMapping
	public ResponseEntity<?> getHashtags(
		@RequestParam(required = false, defaultValue = "1") int page,
		@RequestParam(required = false, defaultValue = "12") int size) {
		Page<HashtagResponseDto> hashtags = hashtagService.getHashtags(page, size);

		PagedResponse<HashtagResponseDto> response = PagedResponse.<HashtagResponseDto>builder()
			.data(hashtags.getContent())
			.totalCount(hashtags.getTotalElements())
			.page(page)
			.size(size)
			.build();

		return ApiResponse.ok("해시태그 리스트 조회 성공", response);
	}

	@Operation(summary = "카테고리ID로 해시태그 조회", description = "카테고리ID에 해당하는 해시태그를 조회합니다.")
	@GetMapping("/category/{categoryId}")
	public ResponseEntity<?> getHashtagsByCategoryId(
		@PathVariable Long categoryId) {
		return ApiResponse.ok("해시태그 리스트 조회 성공", hashtagService.getHashtagsByCategoryId(categoryId));
	}

	@DeleteMapping("/{hashtagId}")
	public ResponseEntity<?> deleteHashtag(
		@PathVariable Long hashtagId) {
		hashtagService.deleteHashtag(hashtagId);
		return ApiResponse.noContent();
	}
}
