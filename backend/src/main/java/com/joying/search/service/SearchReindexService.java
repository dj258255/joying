package com.joying.search.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.file.repository.ProductFileRepository;
import com.joying.hashtag.repository.HashtagHistoryRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;
import com.joying.search.domain.SearchDocument;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.GetAliasResponse;
import co.elastic.clients.elasticsearch.indices.UpdateAliasesRequest;
import co.elastic.clients.elasticsearch.indices.update_aliases.Action;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchReindexService {

	private final ProductRepository productRepository;
	private final HashtagHistoryRepository hashtagHistoryRepository;
	private final ElasticsearchOperations elasticsearchOperations;
	private final ElasticsearchClient esClient;
	private final ProductFileRepository productFileRepository;
	@PersistenceContext
	private EntityManager em;

	/**
	 * 매일 새벽 3시 실행
	 */
	@Transactional(readOnly = true)
	@Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
	public void reindexProducts() {
		log.info("=== [Reindex Start] Product → Elasticsearch ===");

		long startTime = System.currentTimeMillis();
		String dateSuffix = LocalDate.now().toString().replace("-", "_");
		String newIndexName = "search_product_" + dateSuffix;
		String aliasName = "search_product";

		IndexOperations newIndexOps = elasticsearchOperations.indexOps(IndexCoordinates.of(newIndexName));

		createIndexWithRetry(newIndexOps, newIndexName);

		int batchSize = 1000;
		int page = 0;
		long totalCount = productRepository.count();

		log.info("총 {}개 상품 색인 예정 (batch size = {})", totalCount, batchSize);

		while (true) {
			PageRequest pageRequest = PageRequest.of(page, batchSize);
			Page<Product> productPage = productRepository.findAll(pageRequest);

			if (!productPage.hasContent())
				break;

			List<Product> products = productPage.getContent();
			log.info("현재 {}페이지 ({})개 상품 처리 중", page, products.size());

			List<Long> productIds = products.stream()
				.map(Product::getProductId)
				.toList();

			Map<Long, List<String>> hashtagMap = hashtagHistoryRepository.findAllByProductIds(productIds).stream()
				.collect(Collectors.groupingBy(
					h -> h.getProduct().getProductId(),
					Collectors.mapping(h -> h.getHashtag().getHashtagName(), Collectors.toList())
				));

			Map<Long, Long> thumbnailMap = productFileRepository.findThumbnailsByProductIds(productIds).stream()
				.collect(Collectors.toMap(
					pf -> pf.getProduct().getProductId(),
					pf -> pf.getFile().getFileId(),
					(a, b) -> a
				));

			// Document 변환
			List<SearchDocument> docs = products.stream()
				.map(p -> SearchDocument.builder()
					.productId(p.getProductId())
					.title(p.getTitle())
					.content(p.getContent())
					.categoryId(p.getCategory() != null ? p.getCategory().getCategoryId() : null)
					.hashtags(hashtagMap.getOrDefault(p.getProductId(), List.of()))
					.rentalFee(p.getRentalFee())
					.deposit(p.getDeposit())
					.dongId(p.getDong() != null ? p.getDong().getDongId() : null)
					.sido(p.getSido() != null ? p.getSido().getName() : null)
					.gugun(p.getGungu() != null ? p.getGungu().getName() : null)
					.dong(p.getDong() != null ? p.getDong().getName() : null)
					.rentMethod(p.getRentMethod() != null ? p.getRentMethod().name() : null)
					.videoNecessary(p.getVideoNecessary())
					.startRent(toLocalDateTime(p.getStartRent()))
					.endRent(toLocalDateTime(p.getEndRent()))
					.rating(p.getRating() != null ? p.getRating() : null)
					.reviewCount(p.getRatingCount())
					.thumbnailFileId(thumbnailMap.get(p.getProductId()))
					.build())
				.toList();

			// 새 인덱스에 Bulk 색인
			elasticsearchOperations.save(docs, IndexCoordinates.of(newIndexName));
			elasticsearchOperations.indexOps(IndexCoordinates.of(newIndexName)).refresh();

			productRepository.flush();
			em.clear();

			long processed = Math.min((long) (page + 1) * batchSize, totalCount);
			log.info("{}페이지 색인 완료 (누적: {}/{})", page, processed, totalCount);

			if (productPage.isLast())
				break;
			page++;
		}

		log.info("전체 색인 완료");
		// 기존 alias → 새 인덱스로 스위칭 (무중단 전환)
		switchAlias(aliasName, newIndexName);

		log.info("⏱ 총 소요시간: {}ms", System.currentTimeMillis() - startTime);
		log.info("=== [Reindex Complete] ===");
	}

	private LocalDateTime toLocalDateTime(java.time.Instant instant) {
		return instant != null ? instant.atZone(ZoneId.systemDefault()).toLocalDateTime() : null;
	}

	private void createIndexWithRetry(IndexOperations indexOps, String indexName) {
		int maxRetries = 2;

		Map<String, Object> settings = Map.of(
			"analysis", Map.of(
				"tokenizer", Map.of(
					"edge_ngram_tokenizer", Map.of(
						"type", "edge_ngram",
						"min_gram", 2,
						"max_gram", 5,
						"token_chars", List.of("letter", "digit", "whitespace")
					),
					"nori_tokenizer", Map.of(
						"type", "nori_tokenizer"
					)
				),
				"analyzer", Map.of(
					"korean", Map.of(
						"type", "custom",
						"tokenizer", "nori_tokenizer",
						"filter", List.of("nori_part_of_speech", "nori_readingform", "lowercase")
					),
					"korean_autocomplete", Map.of(
						"type", "custom",
						"tokenizer", "edge_ngram_tokenizer",
						"filter", List.of("lowercase")
					)
				)
			)
		);

		for (int attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				if (!indexOps.exists()) {
					indexOps.create(settings);
					indexOps.putMapping(indexOps.createMapping(SearchDocument.class));
				}
				log.info("인덱스 [{}] 생성 완료", indexName);
				return;
			} catch (Exception e) {
				log.warn("인덱스 생성 실패 (시도 {}): {}", attempt, e.getMessage());
				if (attempt == maxRetries) throw e;
				try {
					Thread.sleep(500);
				} catch (InterruptedException ignored) {}
			}
		}
	}

	/**
	 * Alias를 새로운 인덱스로 교체
	 */
	private void switchAlias(String aliasName, String newIndexName) {
		try {
			GetAliasResponse aliasResponse = esClient.indices().getAlias();
			String oldIndex = aliasResponse.result().entrySet().stream()
				.filter(e -> e.getValue().aliases().containsKey(aliasName))
				.map(Map.Entry::getKey)
				.findFirst()
				.orElse(null);

			UpdateAliasesRequest.Builder builder = new UpdateAliasesRequest.Builder();

			if (oldIndex != null) {
				builder.actions(Action.of(a -> a.remove(r -> r.index(oldIndex).alias(aliasName))));
				log.info("기존 인덱스 [{}]의 alias [{}] 제거", oldIndex, aliasName);
			}
			builder.actions(Action.of(a -> a.add(add -> add.index(newIndexName).alias(aliasName))));
			log.info("새 인덱스 [{}]에 alias [{}] 추가", newIndexName, aliasName);

			esClient.indices().updateAliases(builder.build());
			log.info("Alias [{}] → [{}] 전환 완료", aliasName, newIndexName);

			if (oldIndex != null && !oldIndex.equals(newIndexName)) {
				esClient.indices().delete(d -> d.index(oldIndex));
				log.info("이전 인덱스 [{}] 삭제 완료", oldIndex);
			}
		} catch (Exception e) {
			log.error("Alias 전환 중 오류 발생", e);
		}
	}
}