package com.joying.search.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice(basePackages = "com.joying.search")
public class SearchExceptionHandler {
	@ExceptionHandler(ElasticsearchSearchException.class)
	public ResponseEntity<?> handleElasticsearchSearchException(ElasticsearchSearchException e) {
		log.error("❌ ElasticsearchSearchException: {}", e.getMessage());

		Map<String, Object> response = new HashMap<>();
		response.put("error", "ELASTICSEARCH_SEARCH_EXCEPTION");
		response.put("message", e.getMessage());

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}
}