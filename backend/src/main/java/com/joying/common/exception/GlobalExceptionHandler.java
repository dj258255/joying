package com.joying.common.exception;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindingResult;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	/**
	 * 비즈니스 로직 예외 처리
	 */
	@ExceptionHandler(BusinessException.class)
	protected ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
		log.error("BusinessException: code={}, message={}", ex.getErrorCode().getCode(), ex.getMessage());

		ErrorCode errorCode = ex.getErrorCode();
		ErrorResponse response = ErrorResponse.of(
			errorCode.getStatus(),
			errorCode.getCode(),
			ex.getMessage()
		);

		return ResponseEntity
			.status(errorCode.getStatus())
			.body(response);
	}

	/**
	 * 유효성 검증 실패 (Validation)
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	protected ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(
		MethodArgumentNotValidException ex) {

		log.error("MethodArgumentNotValidException: {}", ex.getMessage());

		BindingResult bindingResult = ex.getBindingResult();
		List<ErrorResponse.FieldError> fieldErrors = bindingResult.getFieldErrors()
			.stream()
			.map(error -> ErrorResponse.FieldError.of(
				error.getField(),
				error.getRejectedValue() == null ? "" : error.getRejectedValue().toString(),
				error.getDefaultMessage()
			))
			.collect(Collectors.toList());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.BAD_REQUEST.value(),
			ErrorCode.INVALID_INPUT_VALUE.getCode(),
			ErrorCode.INVALID_INPUT_VALUE.getMessage(),
			fieldErrors
		);

		return ResponseEntity.badRequest().body(response);
	}

	/**
	 * 지원하지 않는 HTTP 메서드 호출
	 */
	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	protected ResponseEntity<ErrorResponse> handleHttpRequestMethodNotSupportedException(
		HttpRequestMethodNotSupportedException ex) {

		log.error("HttpRequestMethodNotSupportedException: {}", ex.getMessage());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.METHOD_NOT_ALLOWED.value(),
			ErrorCode.METHOD_NOT_ALLOWED.getCode(),
			ErrorCode.METHOD_NOT_ALLOWED.getMessage()
		);

		return ResponseEntity
			.status(HttpStatus.METHOD_NOT_ALLOWED)
			.body(response);
	}

	/**
	 * 잘못된 타입의 인자 전달
	 */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	protected ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(
		MethodArgumentTypeMismatchException ex) {

		log.error("MethodArgumentTypeMismatchException: {}", ex.getMessage());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.BAD_REQUEST.value(),
			ErrorCode.INVALID_TYPE_VALUE.getCode(),
			ErrorCode.INVALID_TYPE_VALUE.getMessage()
		);

		return ResponseEntity.badRequest().body(response);
	}

	/**
	 * 필수 요청 파라미터 누락
	 */
	@ExceptionHandler(MissingServletRequestParameterException.class)
	protected ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
		MissingServletRequestParameterException ex) {

		log.error("MissingServletRequestParameterException: {}", ex.getMessage());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.BAD_REQUEST.value(),
			ErrorCode.MISSING_REQUEST_PARAMETER.getCode(),
			String.format("%s (필수 파라미터: %s)", ErrorCode.MISSING_REQUEST_PARAMETER.getMessage(),
				ex.getParameterName())
		);

		return ResponseEntity.badRequest().body(response);
	}

	/**
	 * JSON 파싱 오류
	 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	protected ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
		HttpMessageNotReadableException ex) {

		log.error("HttpMessageNotReadableException: {}", ex.getMessage());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.BAD_REQUEST.value(),
			ErrorCode.INVALID_INPUT_VALUE.getCode(),
			"요청 본문을 읽을 수 없습니다"
		);

		return ResponseEntity.badRequest().body(response);
	}

	/**
	 * 접근 거부 (권한 없음)
	 */
	@ExceptionHandler(AccessDeniedException.class)
	protected ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
		log.error("AccessDeniedException: {}", ex.getMessage());

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.FORBIDDEN.value(),
			ErrorCode.HANDLE_ACCESS_DENIED.getCode(),
			ErrorCode.HANDLE_ACCESS_DENIED.getMessage()
		);

		return ResponseEntity
			.status(HttpStatus.FORBIDDEN)
			.body(response);
	}

	/**
	 * 일반 예외 (최상위 예외 핸들러)
	 */
	@ExceptionHandler(Exception.class)
	protected ResponseEntity<ErrorResponse> handleException(Exception ex) {
		log.error("Exception: {}", ex.getMessage(), ex);

		ErrorResponse response = ErrorResponse.of(
			HttpStatus.INTERNAL_SERVER_ERROR.value(),
			ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
			ErrorCode.INTERNAL_SERVER_ERROR.getMessage()
		);

		return ResponseEntity
			.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(response);
	}
}
