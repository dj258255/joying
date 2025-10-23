package com.joying.account.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 계좌 상태 (금융결제원 오픈뱅킹 기준)
 */
@Getter
@RequiredArgsConstructor
public enum AccountState {

	ACTIVE("01", "정상"),
	DORMANT("02", "휴면"),
	CLOSED("03", "해지"),
	SUSPENDED("04", "정지");

	private final String code;
	private final String description;

	/**
	 * 코드로 AccountState 조회
	 *
	 * @param code 상태 코드
	 * @return AccountState
	 */
	public static AccountState fromCode(String code) {
		for (AccountState state : values()) {
			if (state.code.equals(code)) {
				return state;
			}
		}
		return ACTIVE; // 기본값
	}

	/**
	 * 계좌 사용 가능 여부
	 *
	 * @return 정상 상태 여부
	 */
	public boolean isActive() {
		return this == ACTIVE;
	}
}
