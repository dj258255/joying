package com.joying.payment.metrics;

import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

/**
 * 결제에서 조용히 어긋나는 것을 센다.
 *
 * <p>여기서 세는 것은 전부 지금도 로그에 남는다. 다만 경고로만 남아 아무도 보지
 * 않는다. 오류가 아니어서 알림도 울리지 않는다.
 *
 * <p>그런데 이 값들이 오르는 것은 무언가 잘못되고 있다는 뜻이다. 두 번 누르는 것이
 * 늘면 응답이 느려지고 있다는 신호이고, 오래된 결제를 접는 것이 늘면 사람들이
 * 결제창에서 이탈하고 있다는 신호다.
 *
 * <p>이름을 하나로 두고 이유를 꼬리표로 붙인다. 나눠서 여러 개를 만들면 새 이유가
 * 생길 때마다 대시보드를 고쳐야 한다.
 */
@Component
public class PaymentMetrics {

	/** 결제 버튼을 두 번 눌러 같은 결제를 그대로 돌려준 경우 */
	public static final String DUPLICATE_SUBMIT = "duplicate_submit";

	/** 오래된 READY 결제를 접고 새 주문번호를 낸 경우. 결제창에서 이탈했다는 뜻 */
	public static final String STALE_RETRY = "stale_retry";

	/** 이미 끝난 결제를 다시 만들려 한 경우 */
	public static final String ALREADY_DONE = "already_done";

	/** 금액이 맞지 않아 거절한 경우 */
	public static final String AMOUNT_MISMATCH = "amount_mismatch";

	/** 토스에 묻는 사이 다른 요청이 같은 결제를 먼저 승인해 둔 경우 */
	public static final String CONCURRENT_CONFIRM = "concurrent_confirm";

	/** 토스에 묻는 사이 다른 요청이 같은 결제를 먼저 취소해 둔 경우 */
	public static final String CONCURRENT_CANCEL = "concurrent_cancel";

	private final MeterRegistry registry;

	public PaymentMetrics(MeterRegistry registry) {
		this.registry = registry;
	}

	/**
	 * 정상 경로가 아닌 곳으로 빠진 것을 센다.
	 *
	 * @param reason 위의 상수 중 하나
	 */
	public void offHappyPath(String reason) {
		Counter.builder("payment.create.off.happy.path")
			.description("결제 생성이 정상 경로가 아닌 곳으로 빠진 건수")
			.tag("reason", reason)
			.register(registry)
			.increment();
	}

	/**
	 * 승인이 정상 경로가 아닌 곳으로 빠진 것을 센다.
	 *
	 * <p>생성과 이름을 나눈다. 같은 이름에 꼬리표만 더하면 대시보드에서 생성과
	 * 승인이 한 줄로 합쳐져, 어느 쪽이 오르는지 볼 수 없다.
	 *
	 * @param reason 위의 상수 중 하나
	 */
	public void confirmOffHappyPath(String reason) {
		Counter.builder("payment.confirm.off.happy.path")
			.description("결제 승인이 정상 경로가 아닌 곳으로 빠진 건수")
			.tag("reason", reason)
			.register(registry)
			.increment();
	}

	/**
	 * 취소가 정상 경로가 아닌 곳으로 빠진 것을 센다.
	 *
	 * @param reason 위의 상수 중 하나
	 */
	public void cancelOffHappyPath(String reason) {
		Counter.builder("payment.cancel.off.happy.path")
			.description("결제 취소가 정상 경로가 아닌 곳으로 빠진 건수")
			.tag("reason", reason)
			.register(registry)
			.increment();
	}
}
