package com.joying.common.response;

import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 성공 응답 전용 클래스
 * 실패는 GlobalExceptionHandler에서 ErrorResponse로 처리
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse {

	//200 OK (data만 반환)
	public static <T> ResponseEntity<SuccessBody<T>> ok(T data) {
		return build(HttpStatus.OK, "OK", data);
	}

	//200 OK (message + data)
	public static <T> ResponseEntity<SuccessBody<T>> ok(String message, T data) {
		return build(HttpStatus.OK, message, data);
	}

	//201 CREATED
	public static <T> ResponseEntity<SuccessBody<T>> created(T data) {
		return build(HttpStatus.CREATED, "CREATED", data);
	}

	//202 ACCEPTED
	public static <T> ResponseEntity<SuccessBody<T>> accepted(String message, T data) {
		return build(HttpStatus.ACCEPTED, message, data);
	}

	//204 NO CONTENT
	public static ResponseEntity<Void> noContent() {
		return ResponseEntity.noContent().build();
	}

	//내부 빌더 메서드
	private static <T> ResponseEntity<SuccessBody<T>> build(HttpStatus status, String message, T data) {
		return ResponseEntity.status(status)
				.body(SuccessBody.<T>builder()
						.status(status.value())
						.message(message)
						.data(data)
						.timestamp(LocalDateTime.now())
						.build());
	}

	//성공 응답 Body
	@Getter
	@Builder
	@AllArgsConstructor
	public static class SuccessBody<D> implements Serializable {
		private final int status;                // HTTP 상태 코드
		private final String message;            // 응답 메시지
		private final D data;                    // 실제 데이터
		private final LocalDateTime timestamp;   // 타임스탬프
	}
}
