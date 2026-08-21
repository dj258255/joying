package com.joying.chat.service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.chat.domain.PushSubscription;
import com.joying.chat.dto.PushSubscriptionRequest;
import com.joying.chat.repository.PushSubscriptionRepository;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;

/**
 * 브라우저 푸시 알림.
 *
 * <p>VAPID 키가 없으면 {@code pushService}가 없다. 그럴 때는 보내지 않고 조용히
 * 넘어간다. 알림이 안 가는 것보다 그것 때문에 대화가 막히는 쪽이 나쁘다.
 */
@Service
public class WebPushService {

	private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

	/** 한 사람이 여러 기기에서 구독할 수 있지만 무한정 쌓이게 두지 않는다 */
	private static final int MAX_SUBSCRIPTIONS_PER_USER = 10;

	private final PushSubscriptionRepository pushSubscriptionRepository;
	private final PushService pushService;
	private final ObjectMapper objectMapper;

	public WebPushService(PushSubscriptionRepository pushSubscriptionRepository,
						  @Autowired(required = false) PushService pushService,
						  ObjectMapper objectMapper) {
		this.pushSubscriptionRepository = pushSubscriptionRepository;
		this.pushService = pushService;
		this.objectMapper = objectMapper;
	}

	public boolean isPushEnabled() {
		return pushService != null;
	}

	/**
	 * 구독을 등록한다.
	 *
	 * <p>같은 주소로 다시 오면 새로 만들지 않고 갱신한다. 브라우저가 키를 바꿔 다시
	 * 구독하는 일이 있어서, 새로 만들면 죽은 구독이 쌓인다.
	 */
	@Transactional
	public PushSubscription subscribe(Long memberId, PushSubscriptionRequest request) {
		Optional<PushSubscription> existing =
			pushSubscriptionRepository.findByEndpoint(request.getEndpoint());

		if (existing.isPresent()) {
			PushSubscription subscription = existing.get();
			subscription.setMemberId(memberId);
			subscription.setP256dh(request.getP256dh());
			subscription.setAuth(request.getAuth());
			subscription.setUserAgent(request.getUserAgent());
			log.info("푸시 구독 갱신: memberId={}", memberId);
			return pushSubscriptionRepository.save(subscription);
		}

		List<PushSubscription> existingSubscriptions =
			pushSubscriptionRepository.findByMemberId(memberId);

		if (existingSubscriptions.size() >= MAX_SUBSCRIPTIONS_PER_USER) {
			existingSubscriptions.stream()
				.min(Comparator.comparing(PushSubscription::getCreatedAt))
				.ifPresent(oldest -> {
					log.warn("구독 개수 제한 초과로 가장 오래된 것을 지운다: memberId={}, createdAt={}",
						memberId, oldest.getCreatedAt());
					pushSubscriptionRepository.delete(oldest);
				});
		}

		PushSubscription subscription = new PushSubscription(
			memberId, request.getEndpoint(), request.getP256dh(),
			request.getAuth(), request.getUserAgent());

		log.info("새 푸시 구독 생성: memberId={}, 총 구독 개수={}",
			memberId, existingSubscriptions.size() + 1);
		return pushSubscriptionRepository.save(subscription);
	}

	@Transactional
	public void unsubscribe(String endpoint) {
		pushSubscriptionRepository.deleteByEndpoint(endpoint);
	}

	public List<PushSubscription> getSubscriptions(Long memberId) {
		return pushSubscriptionRepository.findByMemberId(memberId);
	}

	/**
	 * 알림을 보낸다.
	 *
	 * <p>보내는 동안 부르는 쪽을 잡아 두지 않는다. 알림이 늦는 것과 메시지 저장이
	 * 늦는 것은 값이 다르다.
	 */
	@Async
	public void sendNotification(Long memberId, PushNotificationPayload payload) {
		if (!isPushEnabled()) {
			return;
		}

		try {
			List<PushSubscription> subscriptions =
				pushSubscriptionRepository.findByMemberId(memberId);
			if (subscriptions.isEmpty()) {
				return;
			}

			String payloadJson = objectMapper.writeValueAsString(payload);
			for (PushSubscription subscription : subscriptions) {
				sendTo(memberId, subscription, payloadJson);
			}
		} catch (Exception e) {
			log.error("푸시 알림 전송 실패: memberId={}", memberId, e);
		}
	}

	/**
	 * 한 구독에 보낸다.
	 *
	 * <p>브라우저가 구독을 버렸으면 상대가 그것을 상태 코드로 알려 준다. 그때 우리
	 * 기록도 같이 지운다. 안 지우면 죽은 구독에 계속 보내게 된다.
	 */
	private void sendTo(Long memberId, PushSubscription subscription, String payloadJson) {
		try {
			Notification notification = new Notification(
				subscription.getEndpoint(), subscription.getP256dh(),
				subscription.getAuth(), payloadJson);

			int statusCode = pushService.send(notification).getStatusLine().getStatusCode();

			if (statusCode == 410 || statusCode == 404 || statusCode == 400) {
				log.warn("유효하지 않은 구독이라 지운다: memberId={}, statusCode={}", memberId, statusCode);
				pushSubscriptionRepository.delete(subscription);
			} else if (statusCode < 200 || statusCode >= 300) {
				log.error("푸시 알림 전송 실패: memberId={}, statusCode={}", memberId, statusCode);
			}
		} catch (Exception e) {
			log.error("푸시 알림 전송 중 오류: memberId={}", memberId, e);
		}
	}
}
