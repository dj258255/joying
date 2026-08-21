package com.joying.ssafy.dto;

/**
 * 금융망 입금·송금 호출의 결과.
 *
 * <p>돈을 옮기는 호출은 성공과 실패 둘로 나눌 수 없다. 요청을 보낸 뒤 응답을 받지 못하면
 * 돈이 옮겨졌는지 아닌지를 우리는 모른다. 이 상태를 실패로 적으면 실제로 옮겨진 돈이
 * 장부에서 사라지고, 성공으로 적으면 옮겨지지 않은 돈이 장부에 생긴다.
 *
 * <p>그래서 결과를 셋으로 둔다. 금융망이 확정해 준 것만 확정하고, 모르는 것은 모른다고 남긴다.
 * 미확정을 받은 쪽은 되돌리지 말고 그대로 두었다가 거래고유번호로 다시 물어 확정해야 한다.
 */
public sealed interface TransferOutcome {

	/**
	 * 금융망이 성공을 확정해 응답했다. 돈이 옮겨졌다.
	 */
	record Succeeded(String transactionUniqueNo) implements TransferOutcome {
	}

	/**
	 * 금융망이 요청을 받고 거절했다. 돈은 옮겨지지 않았다.
	 */
	record Rejected(String responseCode, String responseMessage) implements TransferOutcome {
	}

	/**
	 * 응답을 받지 못했거나 해석할 수 없다. 돈이 옮겨졌는지 알 수 없다.
	 */
	record Unconfirmed(String reason) implements TransferOutcome {
	}

	default boolean isSucceeded() {
		return this instanceof Succeeded;
	}

	default boolean isUnconfirmed() {
		return this instanceof Unconfirmed;
	}

	/**
	 * 성공했을 때의 거래고유번호. 성공이 아니면 null.
	 * 미확정 건을 나중에 재조회할 때 이 번호가 열쇠가 되므로, 받은 즉시 저장해야 한다.
	 */
	default String transactionUniqueNoOrNull() {
		return this instanceof Succeeded s ? s.transactionUniqueNo() : null;
	}
}
