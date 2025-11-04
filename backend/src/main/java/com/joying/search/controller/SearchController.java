package com.joying.search.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.common.response.ApiResponse;
import com.joying.search.dto.SearchRequest;
import com.joying.search.dto.SearchResponseDto;
import com.joying.search.service.SearchService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search")
public class SearchController {

	private final SearchService searchService;

	@GetMapping("/rdb")
	public ResponseEntity<?> searchRDB(
		@RequestParam(required = false) String q,
		@RequestParam(required = false, name = "price-min") Integer priceMin,
		@RequestParam(required = false, name = "price-max") Integer priceMax,
		@RequestParam(required = false) Long dong,
		@RequestParam(required = false, name = "date-from") LocalDate dateFrom,
		@RequestParam(required = false, name = "date-to") LocalDate dateTo,
		@RequestParam(required = false) Double rating,
		@RequestParam(required = false) String method,
		@RequestParam(required = false) List<Long> category,
		@RequestParam(required = false) List<Long> hashtag,
		@RequestParam(required = false, defaultValue = "1") int page,
		@RequestParam(required = false, defaultValue = "14") int size) {
		SearchResponseDto results = searchService.searchRDB(
			q, priceMin, priceMax, dong, dateFrom, dateTo, rating, method, category, hashtag, page, size
		);

		return ApiResponse.ok(results);
	}

	@GetMapping
	public ResponseEntity<?> search(
		@RequestParam(required = false) String q,
		@RequestParam(required = false, name = "price-min") Integer priceMin,
		@RequestParam(required = false, name = "price-max") Integer priceMax,
		@RequestParam(required = false) Long dong,
		@RequestParam(required = false, name = "date-from") LocalDate dateFrom,
		@RequestParam(required = false, name = "date-to") LocalDate dateTo,
		@RequestParam(required = false) Double rating,
		@RequestParam(required = false) String method,
		@RequestParam(required = false) List<Long> category,
		@RequestParam(required = false) List<Long> hashtag,
		@RequestParam(required = false, defaultValue = "1") int page,
		@RequestParam(required = false, defaultValue = "14") int size) {
		var result = searchService.search(
			q,
			priceMin, priceMax,
			dong,
			dateFrom,
			dateTo,
			rating,
			method,
			category,
			hashtag,
			page,
			size
		);
		return ApiResponse.ok(result);
	}

	@PostMapping
	public void create(@RequestBody SearchRequest request) {
		searchService.save(request);
	}

	@GetMapping("/autocomplete")
	public ResponseEntity<?> autocomplete(@RequestParam String q) {
		return ResponseEntity.ok(searchService.getAutocompleteSuggestions(q));
	}
}
