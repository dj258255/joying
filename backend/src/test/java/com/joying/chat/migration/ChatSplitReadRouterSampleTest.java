package com.joying.chat.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.ThreadLocalRandom;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 섀도 비교 표본 판정 (#124).
 *
 * <p>판정 기준은 이슈에 먼저 적었다. 1.0 은 전수(동작 불변), 0.0 은 비교 0,
 * 0.1 로 1,000회면 표본 50~150 건.
 */
class ChatSplitReadRouterSampleTest {

	@Test
	@DisplayName("기본값 1.0 이면 모든 조회가 표본이다")
	void fullRateSamplesEverything() {
		for (int i = 0; i < 1000; i++) {
			assertThat(ChatSplitReadRouter.sampled(1.0, ThreadLocalRandom.current().nextDouble()))
				.isTrue();
		}
	}

	@Test
	@DisplayName("0.0 이면 아무것도 뽑지 않는다")
	void zeroRateSamplesNothing() {
		for (int i = 0; i < 1000; i++) {
			assertThat(ChatSplitReadRouter.sampled(0.0, ThreadLocalRandom.current().nextDouble()))
				.isFalse();
		}
	}

	@Test
	@DisplayName("0.1 로 1,000회면 표본이 50~150 건이다")
	void tenPercentRateSamplesAboutTenPercent() {
		long sampled = 0;
		for (int i = 0; i < 1000; i++) {
			if (ChatSplitReadRouter.sampled(0.1, ThreadLocalRandom.current().nextDouble())) {
				sampled++;
			}
		}
		assertThat(sampled).isBetween(50L, 150L);
	}
}
