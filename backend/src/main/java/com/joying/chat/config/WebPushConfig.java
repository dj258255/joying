package com.joying.chat.config;

import java.security.Security;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import nl.martijndwars.webpush.PushService;

/**
 * 웹 푸시 설정.
 *
 * <p>{@code web-push.enabled=true} 이고 VAPID 키가 있을 때만 켜진다. 키가 없으면
 * 푸시를 보낼 수 없으므로 빈을 만들지 않는다.
 */
@Configuration
@ConditionalOnProperty(name = "web-push.enabled", havingValue = "true")
public class WebPushConfig {

	private static final Logger log = LoggerFactory.getLogger(WebPushConfig.class);

	@Value("${web-push.public-key:}")
	private String publicKey = "";

	@Value("${web-push.private-key:}")
	private String privateKey = "";

	public WebPushConfig() {
		// 푸시 암호화에 필요한 프로바이더를 한 번만 등록한다
		if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
			Security.addProvider(new BouncyCastleProvider());
		}
	}

	@Bean
	public PushService pushService() {
		if (publicKey.isBlank() || privateKey.isBlank()) {
			log.warn("VAPID 키가 없어 푸시 알림을 보낼 수 없습니다");
			return null;
		}

		try {
			PushService pushService = new PushService();
			pushService.setPublicKey(publicKey);
			pushService.setPrivateKey(privateKey);
			return pushService;

		} catch (Exception e) {
			// 키가 없는 것과 같이 다룬다.
			//
			// 예전에는 여기서 오른 예외가 그대로 나갔다. 이 빈을 채팅이 지나가므로
			// 열쇠 한 줄이 잘못 들어가면 푸시가 아니라 앱 전체가 뜨지 않았다.
			// 배포로 채워 넣는 값이라 눈으로 확인할 기회도 없다.
			//
			// 푸시를 못 보내는 것과 아무것도 못 하는 것은 크기가 다르다.
			log.error("VAPID 키가 올바르지 않아 푸시 알림을 끕니다. 값을 확인하라", e);
			return null;
		}
	}

	@Bean
	public String vapidPublicKey() {
		return publicKey;
	}
}
