package com.joying.common.exception;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "에러 응답")
public class ErrorResponse {

	@Schema(description = "HTTP 상태 코드", example = "400")
	private final int status;

	@Schema(description = "에러 코드", example = "INVALID_INPUT")
	private final String code;

	@Schema(description = "에러 메시지", example = "잘못된 요청입니다")
	private final String message;

	@Schema(description = "필드 에러 목록")
	private final List<FieldError> errors;

	@Schema(description = "타임스탬프", example = "2025-01-22T10:30:00")
	private final LocalDateTime timestamp;

	public static ErrorResponse of(int status, String code, String message) {
		return ErrorResponse.builder()
			.status(status)
			.code(code)
			.message(message)
			.timestamp(LocalDateTime.now())
			.build();
	}

	public static ErrorResponse of(int status, String code, String message, List<FieldError> errors) {
		return ErrorResponse.builder()
			.status(status)
			.code(code)
			.message(message)
			.errors(errors)
			.timestamp(LocalDateTime.now())
			.build();
	}

	@Getter
	@Builder
	@Schema(description = "필드 에러 정보")
	public static class FieldError {

		@Schema(description = "에러 필드명", example = "email")
		private final String field;

		@Schema(description = "입력된 값", example = "invalid-email")
		private final String value;

		@Schema(description = "에러 사유", example = "올바른 이메일 형식이 아닙니다")
		private final String reason;

		public static FieldError of(String field, String value, String reason) {
			return FieldError.builder()
				.field(field)
				.value(value)
				.reason(reason)
				.build();
		}
	}
}