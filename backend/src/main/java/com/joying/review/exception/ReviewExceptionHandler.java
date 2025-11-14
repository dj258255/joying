package com.joying.review.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.joying.review")
public class ReviewExceptionHandler {
	@ExceptionHandler(CannotWriteReviewException.class)
	public ResponseEntity<Map<String, Object>> handleCannotWriteReview(CannotWriteReviewException ex) {
		Map<String, Object> body = new HashMap<>();
		body.put("error", "REVIEW_NOT_ALLOWED");
		body.put("message", ex.getMessage());

		return ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(body);
	}
}