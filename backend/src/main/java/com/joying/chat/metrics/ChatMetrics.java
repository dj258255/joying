package com.joying.chat.metrics;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import com.joying.chat.config.KeyOrderedExecutor;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

/**
 * 채팅에서 지켜볼 것을 모은다.
 *
 * <p>부하로 재서 알아낸 것들을 운영에서도 보기 위해 둔다. 실험은 한 번 하고 끝나지만
 * 같은 일은 배포한 뒤에도 일어난다.
 *
 * <p>지표를 고른 기준은 "무너질 때 먼저 움직이는가" 다.
 *
 * <ul>
 *   <li>줄 길이는 저장소가 느려질 때 가장 먼저 움직인다. 지연 300ms 를 주입했을 때
 *       왕복이 1.67초에서 64초로 밀린 것이 이 줄이 쌓인 결과다.
 *   <li>전달까지 걸린 시간은 사용자가 실제로 겪는 값이다.
 *   <li>멱등으로 걸러진 건수는 재전송이 얼마나 일어나는지 알려 준다. 늘어나면 발행이
 *       실패하고 있다는 뜻이다.
 *   <li>번호 발급 실패는 Redis 가 흔들린다는 신호다. 이 값이 오르면 메시지가 저장되지
 *       않는다.
 * </ul>
 */
@Component
public class ChatMetrics {

	private final Timer queueWait;
	private final Timer deliveryLatency;
	private final Counter idempotentHits;
	private final Counter sequenceFailures;

	public ChatMetrics(MeterRegistry registry,
					   @Qualifier("chatMessageExecutor") KeyOrderedExecutor messageExecutor,
					   @Qualifier("chatDeliveryExecutor") KeyOrderedExecutor deliveryExecutor) {

		this.queueWait = Timer.builder("chat.message.queue.wait")
			.description("줄에 들어간 때부터 처리가 시작될 때까지")
			.publishPercentiles(0.5, 0.95, 0.99)
			.register(registry);

		this.deliveryLatency = Timer.builder("chat.message.delivery")
			.description("메시지가 만들어진 때부터 화면으로 나갈 때까지")
			.publishPercentiles(0.5, 0.95, 0.99)
			.register(registry);

		this.idempotentHits = Counter.builder("chat.message.idempotent.hits")
			.description("같은 전송 식별자로 다시 들어와 저장하지 않고 돌려준 건수")
			.register(registry);

		this.sequenceFailures = Counter.builder("chat.message.sequence.failures")
			.description("번호를 받지 못해 저장을 막은 건수")
			.register(registry);

		// 가장 많이 밀린 줄의 길이. 평균을 내면 한 방에 몰린 것이 묻힌다
		Gauge.builder("chat.executor.queue.max", messageExecutor, KeyOrderedExecutor::maxQueueDepth)
			.description("메시지 처리에서 가장 많이 밀린 줄의 길이")
			.tag("executor", "message")
			.register(registry);

		Gauge.builder("chat.executor.queue.depth", messageExecutor, KeyOrderedExecutor::totalQueueDepth)
			.description("메시지 처리에 밀려 있는 일의 합")
			.tag("executor", "message")
			.register(registry);

		Gauge.builder("chat.executor.queue.max", deliveryExecutor, KeyOrderedExecutor::maxQueueDepth)
			.description("전달에서 가장 많이 밀린 줄의 길이")
			.tag("executor", "delivery")
			.register(registry);

		Gauge.builder("chat.executor.queue.depth", deliveryExecutor, KeyOrderedExecutor::totalQueueDepth)
			.description("전달에 밀려 있는 일의 합")
			.tag("executor", "delivery")
			.register(registry);
	}

	/**
	 * 줄에 들어간 때부터 처리가 시작될 때까지를 기록한다.
	 *
	 * <p>같은 방의 메시지를 한 줄로 세우므로 앞엣것이 끝나야 뒤엣것이 시작된다. 저장소가
	 * 느려지면 이 값이 먼저 커지고, 사용자가 겪는 지연의 대부분이 여기서 나온다.
	 *
	 * <p>저장 시각부터 재면 이 시간이 통째로 빠진다. 저장 시각은 줄에서 빠져나온 뒤에
	 * 찍히기 때문이다.
	 */
	public void recordQueueWait(Instant enqueuedAt) {
		if (enqueuedAt == null) {
			return;
		}
		Duration elapsed = Duration.between(enqueuedAt, Instant.now());
		if (elapsed.isNegative()) {
			return;
		}
		queueWait.record(elapsed);
	}

	/**
	 * 메시지가 만들어진 때부터 지금까지를 기록한다.
	 *
	 * <p>기준을 저장 시각으로 잡은 이유는 보낸 시각을 믿을 수 없어서다. 보낸 시각은
	 * 사용자 기기의 시계라 서버 시계와 다를 수 있고, 음수가 나오기도 한다.
	 */
	public void recordDelivery(Instant createdAt) {
		if (createdAt == null) {
			return;
		}
		Duration elapsed = Duration.between(createdAt, Instant.now());
		if (elapsed.isNegative()) {
			return;
		}
		deliveryLatency.record(elapsed);
	}

	public void idempotentHit() {
		idempotentHits.increment();
	}

	public void sequenceFailure() {
		sequenceFailures.increment();
	}
}
