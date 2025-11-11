package com.joying.search;

import org.springframework.context.event.EventListener;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.stereotype.Component;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.GetAliasResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class ElasticsearchAliasInitializer {

	private final ElasticsearchClient esClient;
	private final ElasticsearchOperations operations;

	private static final String INIT_INDEX = "search_product_init";
	private static final String ALIAS_NAME = "search_product";

	@EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
	public void initAlias() {
		try {
			IndexOperations initOps = operations.indexOps(IndexCoordinates.of(INIT_INDEX));

			// 1️⃣ search_product_init 인덱스 존재 여부 확인
			if (!initOps.exists()) {
				log.info("[{}] 인덱스 없음 — Alias 초기화 생략", INIT_INDEX);
				return;
			}

			// 2️⃣ 이미 alias가 있는지 확인
			boolean aliasExists = false;
			try {
				GetAliasResponse aliasResponse = esClient.indices()
					.getAlias(a -> a.name(ALIAS_NAME).ignoreUnavailable(true));
				aliasExists = !aliasResponse.result().isEmpty();
			} catch (Exception e) {
				log.warn("Alias [{}] 조회 중 예외 발생 (없음으로 간주): {}", ALIAS_NAME, e.getMessage());
			}

			if (aliasExists) {
				log.info("Alias [{}] 이미 존재 — 초기화 생략", ALIAS_NAME);
				return;
			}

			// 3️⃣ alias 연결
			esClient.indices().updateAliases(b -> b
				.actions(a -> a.add(add -> add.index(INIT_INDEX).alias(ALIAS_NAME)))
			);

			log.info("초기 인덱스 [{}] → Alias [{}] 연결 완료", INIT_INDEX, ALIAS_NAME);

		} catch (Exception e) {
			log.error("Alias 초기화 중 오류 발생", e);
		}
	}
}
