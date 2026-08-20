package com.joying.chat.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.joying.chat.dto.PushSubscriptionRequest;
import com.joying.chat.dto.PushUnsubscribeRequest;
import com.joying.chat.service.WebPushService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 브라우저 푸시 알림 구독을 다룬다.
 */
@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
public class PushNotificationController {

	private static final Logger log = LoggerFactory.getLogger(PushNotificationController.class);

	private final WebPushService webPushService;

	@Value("${web-push.public-key:}")
	private String vapidPublicKey;

	/**
	 * 구독을 만들 때 브라우저가 필요로 하는 공개키.
	 */
	@GetMapping("/vapid-public-key")
	public ResponseEntity<Map<String, String>> getVapidPublicKey() {
		return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
	}

	@PostMapping("/subscribe")
	public ResponseEntity<Map<String, String>> subscribe(
		@Valid @RequestBody PushSubscriptionRequest request) {

		Long memberId = CurrentMember.id();
		log.info("푸시 구독 등록 요청: memberId={}, endpoint={}", memberId, request.getEndpoint());

		webPushService.subscribe(memberId, request);
		return ResponseEntity.ok(Map.of("message", "푸시 알림 구독이 등록되었습니다"));
	}

	@PostMapping("/unsubscribe")
	public ResponseEntity<Map<String, String>> unsubscribe(
		@Valid @RequestBody PushUnsubscribeRequest request) {

		webPushService.unsubscribe(request.getEndpoint());
		return ResponseEntity.ok(Map.of("message", "푸시 알림 구독이 해제되었습니다"));
	}
}
