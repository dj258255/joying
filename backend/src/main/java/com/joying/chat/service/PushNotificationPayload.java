package com.joying.chat.service;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 브라우저에 띄울 알림의 내용.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class PushNotificationPayload {

	private String title;
	private String body;
	private String icon;
	private String image;
	private String badge;

	/** 같은 태그의 알림은 브라우저가 하나로 합친다 */
	private String tag;

	@Builder.Default
	private Map<String, Object> data = Map.of();
}
