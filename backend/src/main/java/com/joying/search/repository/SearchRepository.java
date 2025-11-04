package com.joying.search.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import com.joying.search.domain.SearchDocument;

@Repository
public interface SearchRepository extends ElasticsearchRepository<SearchDocument, Long> {
}
