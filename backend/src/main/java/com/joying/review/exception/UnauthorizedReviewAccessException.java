package com.joying.review.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UnauthorizedReviewAccessException extends RuntimeException {
	public UnauthorizedReviewAccessException(String message) {
		super(message);
	}
}
