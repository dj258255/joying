package com.joying.account.domain;

import java.util.Optional;

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
	 * 코드로 AccountState 조회.
	 *
	 * <p>모르는 코드를 정상으로 되돌리면 휴면이나 해지된 계좌가 정상으로 통과한다.
	 * 그래서 모르는 코드는 비어 있는 값으로 돌려주고, 무엇으로 볼지는 부르는 쪽이 정한다.
	 *
	 * @param code 상태 코드
	 * @return 아는 코드면 해당 상태, 모르는 코드면 비어 있음
	 */
	public static Optional<AccountState> fromCode(String code) {
		for (AccountState state : values()) {
			if (state.code.equals(code)) {
				return Optional.of(state);
			}
		}
		return Optional.empty();
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
