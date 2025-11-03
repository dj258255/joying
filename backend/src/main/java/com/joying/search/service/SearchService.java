package com.joying.search.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.hashtag.repository.HashtagHistoryRepository;
import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;
import com.joying.product.repository.ProductRepository;
import com.joying.search.dto.HashtagInfo;
import com.joying.search.dto.SearchResponse;
import com.joying.search.dto.SearchResponseDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

	private final ProductRepository productRepository;
	private final HashtagHistoryRepository hashtagHistoryRepository;

	@Transactional
	public SearchResponseDto searchRDB(
		String q,
		Integer priceMin,
		Integer priceMax,
		Long dong,
		LocalDate dateFrom,
		LocalDate dateTo,
		Double rating,
		String method,
		List<Long> categoryIds,
		List<Long> hashtagIds,
		int page,
		int size) {
		Instant dateFromInstant = (dateFrom == null) ? null : Instant.parse(dateFrom + "T00:00:00Z");
		Instant dateToInstant = (dateTo == null) ? null : Instant.parse(dateTo + "T23:59:59Z");
		Integer hashtagCount = (hashtagIds == null || hashtagIds.isEmpty()) ? null : hashtagIds.size();
		RentMethod rentMethodEnum = null;
		if (method != null && !method.isBlank()) {
			try {
				rentMethodEnum = RentMethod.valueOf(method.toUpperCase());
			} catch (IllegalArgumentException e) {
				throw new IllegalArgumentException("잘못된 거래 방식입니다: " + method);
			}
		}

		List<Product> test = productRepository.findAll();
		log.info("test: {}", test);
		log.info("test Size: {}", test.size());

		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "productId"));
		Page<Product> products = productRepository.searchProducts(q, priceMin, priceMax, dong, dateFromInstant, dateToInstant,
				rating, rentMethodEnum, categoryIds, hashtagIds, hashtagCount, pageRequest);

		log.info("================================");
		log.info(String.valueOf(products.getContent().size()));
		log.info("q : {}", q);
		log.info("priceMin : {}", priceMin);
		log.info("priceMax : {}", priceMax);
		log.info("dong : {}", dong);
		log.info("dateFrom : {}", dateFrom);
		log.info("dateTo : {}", dateTo);
		log.info("rating : {}", rating);
		log.info("method : {}", method);
		log.info("categoryIds : {}", categoryIds);
		log.info("hashtagIds : {}", hashtagIds);
		log.info("hashtagCount : {}", hashtagCount);
		log.info("================================");

		List<SearchResponse> responses = products.stream().map(SearchResponse::fromEntity).toList();

		List<Long> productIds = products.stream()
			.map(Product::getProductId)
			.toList();

		List<HashtagInfo> hashtags = hashtagHistoryRepository.findHashtagCountInProducts(productIds).stream()
			.map(p -> HashtagInfo.builder()
				.count(p.getCount())
				.hashtag(p.getHashtag())
				.build())
			.toList();

		return SearchResponseDto.builder()
			.searchResponses(responses)
			.hashtags(hashtags)
			.totalElements(products.getTotalElements())
			.page(page)
			.size(size)
			.build();
	}
}
