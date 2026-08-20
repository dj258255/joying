package com.joying.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 웹 푸시 구독 등록 요청.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscriptionRequest {

	@NotBlank(message = "엔드포인트는 필수입니다")
	private String endpoint;

	@NotBlank(message = "p256dh 키는 필수입니다")
	private String p256dh;

	@NotBlank(message = "auth 키는 필수입니다")
	private String auth;

	private String userAgent;
}
