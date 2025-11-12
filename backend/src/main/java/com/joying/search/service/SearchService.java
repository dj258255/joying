package com.joying.search.service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import com.joying.hashtag.repository.HashtagHistoryRepository;
import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;
import com.joying.product.domain.UploadType;
import com.joying.product.repository.ProductLikeRepository;
import com.joying.product.repository.ProductRepository;
import com.joying.search.domain.SearchDocument;
import com.joying.search.dto.HashtagInfo;
import com.joying.search.dto.SearchRequest;
import com.joying.search.dto.SearchDto;
import com.joying.search.dto.SearchResponseDto;
import com.joying.search.exception.ElasticsearchSearchException;
import com.joying.search.repository.SearchRepository;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOptions;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.DateRangeQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MatchAllQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MatchQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MultiMatchQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.NumberRangeQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.RangeQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.TermQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.TermsQuery;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.elasticsearch.indices.AnalyzeRequest;
import co.elastic.clients.elasticsearch.indices.AnalyzeResponse;
import co.elastic.clients.elasticsearch.indices.analyze.AnalyzeToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

	private final ProductRepository productRepository;
	private final ProductLikeRepository productLikeRepository;
	private final HashtagHistoryRepository hashtagHistoryRepository;
	private final SearchRepository searchRepository;
	private final ElasticsearchOperations elasticsearchOperations;
	private final ElasticsearchClient elasticsearchClient;
	private final FileUrlResolver fileUrlResolver;
	private final FileRepository fileRepository;

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

		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "productId"));
		Page<Product> products = productRepository.searchProducts(q, priceMin, priceMax, dong, dateFromInstant, dateToInstant,
				rating, rentMethodEnum, categoryIds, hashtagIds, hashtagCount, pageRequest);

		List<SearchDto> responses = products.stream().map(SearchDto::fromEntityRDB).toList();

		List<Long> productIds = products.stream()
			.map(Product::getProductId)
			.toList();

		List<HashtagInfo> hashtags = hashtagHistoryRepository.findHashtagCountInProducts(productIds).stream()
			.map(p -> HashtagInfo.builder()
				.count(p.getCount())
				.name(p.getHashtag())
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

	@Transactional(readOnly = true)
	public SearchResponseDto search(
		String uploadTypeStr,
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
		Boolean sameDayRental,
		int page,
		int size,
		Long authId) {
		UploadType uploadType = null;
		if (uploadTypeStr != null) {
			try {
				uploadType = UploadType.valueOf(uploadTypeStr.toUpperCase());
			} catch (IllegalArgumentException e) {
				throw new IllegalArgumentException("유효하지 않은 uploadType 입니다.");
			}
		}
		Instant dateFromInstant = (dateFrom == null) ? null : Instant.parse(dateFrom + "T00:00:00Z");
		Instant dateToInstant = (dateTo == null) ? null : Instant.parse(dateTo + "T23:59:59Z");
		RentMethod rentMethod = null;
		if (method != null) {
			try {
				rentMethod = RentMethod.valueOf(method.toUpperCase());
			} catch (IllegalArgumentException e) {
				throw new IllegalArgumentException("유효하지 않은 rentMethod 입니다.");
			}
		}
		if (rating == null) rating = 0.0;
		if (sameDayRental != null && sameDayRental && dateFromInstant == null && dateToInstant == null) {
			LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
			dateFrom = today;
			dateTo = today;
			dateFromInstant = Instant.parse(today + "T00:00:00Z");
			dateToInstant = Instant.parse(today + "T23:59:59Z");
		}

		log.info("📘 [Search] 요청 파라미터 => uploadTypeStr: {}, q: {}, priceMin: {}, priceMax: {}, dong: {}, dateFrom: {}, dateTo: {}, rating: {}, method: {}, categoryIds: {}, hashtagIds: {}, sameDayRental: {}, page: {}, size: {}",
			uploadTypeStr, q, priceMin, priceMax, dong, dateFrom, dateTo, rating, method, categoryIds, hashtagIds, sameDayRental, page, size);
		log.info("✅ [Search] 변환 완료 => uploadType: {}, rentMethod: {}, rating: {}, dateFromInstant: {}, dateToInstant: {}",
			uploadType, rentMethod, rating, dateFromInstant, dateToInstant);

		List<SearchDocument> available = new ArrayList<>();
		Long totalHits = 0L;
		Integer fetchCount = 0;
		List<SortOptions> sortOptions = new ArrayList<>();

		while (true) {
			List<Query> mustQueries = new ArrayList<>();
			List<Query> shouldQueries = new ArrayList<>();
			List<Query> filterQueries = new ArrayList<>();

			// 키워드 검색
			boolean hasKeyword = (q != null && !q.isBlank());
			if (hasKeyword) {
				mustQueries.add(
					MultiMatchQuery.of(m -> m
						.fields("title^2", "content")
						.query(q)
						.operator(Operator.Or)
					)._toQuery()
				);

				List<String> tokens = analyzeText(q);
				if (tokens.size() > 1) {
					for (String token : tokens) {
						List<Query> tokenShould = new ArrayList<>();
						tokenShould.add(MatchQuery.of(m -> m.field("title").query(token))._toQuery());
						tokenShould.add(MatchQuery.of(m -> m.field("content").query(token))._toQuery());

						shouldQueries.add(
							BoolQuery.of(b -> b
								.should(tokenShould)
								.minimumShouldMatch("1")
							)._toQuery()
						);
					}
				}
			} else {
				sortOptions = List.of(
					SortOptions.of(s -> s.field(f -> f.field("productId").order(SortOrder.Desc)))
				);
			}

			// 업로드 타입 필터
			UploadType finalUploadType = uploadType;
			log.info("UploadType {}", uploadType);
			log.info("UploadType name {}", uploadType.name());
			TermQuery uploadTypeQuery = TermQuery.of(t -> t.field("uploadType").value(finalUploadType.name()));
			filterQueries.add(uploadTypeQuery._toQuery());

			// 가격 필터
			if (priceMin != null || priceMax != null) {
				NumberRangeQuery.Builder numberRangeBuilder = new NumberRangeQuery.Builder()
					.field("rentalFee");

				if (priceMin != null) {
					numberRangeBuilder.gte(Double.valueOf(priceMin));
				}

				if (priceMax != null) {
					numberRangeBuilder.lte(Double.valueOf(priceMax));
				}

				RangeQuery feeRange = new RangeQuery.Builder()
					.number(numberRangeBuilder.build())
					.build();

				filterQueries.add(feeRange._toQuery());
			}

			// 지역 필터
			if (dong != null) {
				TermQuery dongQuery = TermQuery.of(t -> t.field("dongId").value(dong));
				filterQueries.add(dongQuery._toQuery());
			}

			// 카테고리 필터
			if (categoryIds != null && !categoryIds.isEmpty()) {
				TermsQuery categoryQuery = new TermsQuery.Builder()
					.field("categoryId")
					.terms(t -> t.value(
						categoryIds.stream()
							.map(FieldValue::of)
							.toList()
					))
					.build();

				filterQueries.add(categoryQuery._toQuery());
			}

			// 렌트 방식 필터
			if (method != null && !method.isBlank()) {
				RentMethod finalRentMethod = rentMethod;
				TermQuery rentMethodQuery = TermQuery.of(t -> t.field("rentMethod").value(finalRentMethod.name()));
				filterQueries.add(rentMethodQuery._toQuery());
			}

			// 날짜 범위 필터
			if (dateFrom != null && dateTo != null) {
				DateTimeFormatter ES_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");
				LocalDateTime startDateTime = dateFrom.atStartOfDay();
				LocalDateTime endDateTime = dateTo.atTime(23, 59, 59, 999_000_000);

				String fromStr = startDateTime.format(ES_DATE_FORMATTER);
				String toStr = endDateTime.format(ES_DATE_FORMATTER);

				RangeQuery dateRangeQuery = new RangeQuery.Builder()
					.date(d -> d
						.field("startRent")
						.lte(fromStr)
					)
					.build();

				RangeQuery dateRangeQuery2 = new RangeQuery.Builder()
					.date(d -> d
						.field("endRent")
						.gte(toStr)
					)
					.build();
				filterQueries.add(dateRangeQuery._toQuery());
				filterQueries.add(dateRangeQuery2._toQuery());
			}

			// 해시태그 필터
			if (hashtagIds != null && !hashtagIds.isEmpty()) {
				TermsQuery hashtagsQuery = TermsQuery.of(t -> t
					.field("hashtags")
					.terms(v -> v.value(hashtagIds.stream().map(FieldValue::of).toList()))
				);
				filterQueries.add(hashtagsQuery._toQuery());
			}

			// BoolQuery 조합
			BoolQuery.Builder boolBuilder = new BoolQuery.Builder();
			if (mustQueries.isEmpty()) {
				Query matchAll = MatchAllQuery.of(m -> m)._toQuery();
				boolBuilder.must(matchAll);
			} else {
				boolBuilder.must(mustQueries);
			}

			if (hasKeyword) {
				boolBuilder.should(shouldQueries);
				// boolBuilder.minimumShouldMatch("1");
			}
			boolBuilder.filter(filterQueries);
			Query boolQuery = boolBuilder.build()._toQuery();

			log.info("Final BoolQuery JSON: {}", boolQuery.toString());

			// 정렬
			// List<SortOptions> sortOptions = List.of(
			// 	SortOptions.of(s -> s.field(f -> f.field("rating").order(SortOrder.Desc))),
			// 	SortOptions.of(s -> s.field(f -> f.field("rentalFee").order(SortOrder.Asc)))
			// );

			elasticsearchOperations.indexOps(SearchDocument.class).refresh();

			// 페이지네이션
			Pageable pageable = PageRequest.of(Math.max(page - 1, 0), size);

			// NativeQuery 빌드
			NativeQuery searchQuery = null;
			if (sortOptions.isEmpty()) {
				searchQuery = NativeQuery.builder()
					.withQuery(boolQuery)
					.withPageable(pageable)
					.build();
			} else {
				searchQuery = NativeQuery.builder()
					.withQuery(boolQuery)
					.withSort(sortOptions)
					.withPageable(pageable)
					.build();
			}

			// 검색 실행
			SearchHits<SearchDocument> hits =
				elasticsearchOperations.search(searchQuery, SearchDocument.class);

			if (!hits.hasSearchHits()) break;

			List<Long> productIds = hits.stream()
				.map(hit -> hit.getContent().getProductId())
				.toList();

			Set<Long> excludeSet = new HashSet<>();

			if (dateFrom != null && dateTo != null) {
				List<Long> unavailableIds = productRepository.findUnavailableProductIds(
					productIds, dateFromInstant, dateToInstant
				);
				excludeSet.addAll(unavailableIds);
			}

			if (rating != 0.0) {
				List<Long> lowRatedIds = productRepository.findProductIdsWithRatingLessThan(
					productIds, rating
				);
				excludeSet.addAll(lowRatedIds);
			}

			for (SearchHit<SearchDocument> hit : hits) {
				SearchDocument doc = hit.getContent();
				if (!excludeSet.contains(doc.getProductId())) {
					available.add(doc);
				}
				if (available.size() >= size) break;
			}

			totalHits = hits.getTotalHits();
			if (totalHits <= (long)(page + fetchCount) * size) break;
			if (available.size() == size) break;
			fetchCount += 1;
			page++;
		}

		List<Long> fileIds = available.stream()
			.map(SearchDocument::getThumbnailFileId)
			.filter(Objects::nonNull)
			.toList();

		Map<Long, File> fileMap = fileRepository.findAllById(fileIds).stream()
			.collect(Collectors.toMap(File::getFileId, Function.identity()));

		List<Long> productIds = available.stream()
			.map(SearchDocument::getProductId)
			.toList();

		Map<Long, Boolean> likeMap;
		if (authId != null) {
			List<Long> likedProductIds = productLikeRepository.findLikedProductIdsByMemberAndProductIds(authId, productIds);

			likeMap = productIds.stream()
				.distinct()
				.collect(Collectors.toMap(
					id -> id,
					likedProductIds::contains
				));
		} else {
			likeMap = new HashMap<>();
		}

		List<SearchDto> responses = available.stream()
			.map(s -> {
				File file = fileMap.get(s.getThumbnailFileId());
				Boolean isLike = likeMap.getOrDefault(s.getProductId(), false);
				if (file == null) return SearchDto.fromEntity(s, null, isLike);
				return SearchDto.fromEntity(s, fileUrlResolver.toPublicUrl(file), isLike);
			})
			.toList();

		List<HashtagInfo> hashtags = hashtagHistoryRepository.findHashtagCountInProducts(productIds).stream()
			.map(p -> HashtagInfo.builder()
				.count(p.getCount())
				.id(p.getHashtagId())
				.name(p.getHashtag())
				.build())
			.toList();

		return SearchResponseDto.builder()
			.searchResponses(responses)
			.hashtags(hashtags)
			.totalElements((long)available.size())
			.page(page)
			.size(size)
			.fetchCount(fetchCount)
			.build();
	}

	@Transactional
	public void save(SearchRequest request) {
		SearchDocument doc = SearchDocument.from(request);
		searchRepository.save(doc);
	}

	@Transactional
	public void bulkSave(List<SearchRequest> requests) {
		List<SearchDocument> docs = requests.stream()
			.map(SearchDocument::from)
			.collect(Collectors.toList());
		searchRepository.saveAll(docs);
	}

	public List<String> getAutocompleteSuggestions(String keyword) {
		if (keyword == null || keyword.isBlank()) {
			return List.of();
		}

		Query autocompleteQuery = MatchQuery.of(m -> m
			.field("title.autocomplete")
			.query(keyword)
		)._toQuery();

		SearchResponse<SearchDocument> response = null;
		try {
			response = elasticsearchClient.search(s -> s
					.index("search_product")
					.size(5)
					.query(autocompleteQuery)
					.source(src -> src
						.filter(f -> f.includes("title"))
					),
				SearchDocument.class
			);
		} catch (IOException e) {
			throw new ElasticsearchSearchException("자동완성 검색 중 오류가 발생했습니다.", e);
		}

		return Objects.requireNonNull(response).hits().hits().stream()
			.map(Hit::source).filter(Objects::nonNull)
			.map(SearchDocument::getTitle)
			.distinct()
			.collect(Collectors.toList());
	}

	private List<String> analyzeText(String text) {
		try {
			AnalyzeResponse response = elasticsearchClient.indices().analyze(
				AnalyzeRequest.of(a -> a
					.index("search_product")
					.analyzer("korean")
					.text(text)
				)
			);

			return response.tokens().stream()
				.map(AnalyzeToken::token)
				.toList();

		} catch (IOException e) {
			throw new ElasticsearchSearchException("Nori analyzer 실행 중 오류가 발생했습니다.", e);
		}
	}
}
