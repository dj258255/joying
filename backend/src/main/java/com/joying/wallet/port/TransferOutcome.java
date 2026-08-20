package com.joying.wallet.port;

/**
 * 돈을 옮긴 결과.
 *
 * <p>셋인 이유는 밖으로 나가는 호출 때문이다. 요청을 보낸 뒤 응답을 받지 못하면
 * 돈이 옮겨졌는지 아닌지를 알 수 없다. 이 상태를 실패로 적으면 실제로 옮겨진 돈이
 * 장부에서 사라지고, 성공으로 적으면 옮겨지지 않은 돈이 장부에 생긴다.
 *
 * <p>안에서 옮기는 구현은 커밋되거나 롤백되거나 둘뿐이라 {@link Unconfirmed}를
 * 만들지 않는다. 그래도 이 자리를 남겨 둔 이유는, 그 상태가 필요 없어진 것이 아니라
 * 그 구현에서만 생기지 않기 때문이다. 부르는 쪽은 어느 구현이 붙어 있든 셋을 모두
 * 다뤄야 하고, 그래야 밖으로 나가는 구현으로 바꿔도 코드가 그대로 맞는다.
 */
public sealed interface TransferOutcome {

	/**
	 * 옮겼다.
	 *
	 * @param transferId 이 이체를 가리키는 값. 내부 원장이면 이체 번호, 외부
	 *                   금융망이면 거래고유번호다. 나중에 이 건을 다시 물을 열쇠가 된다
	 */
	record Succeeded(String transferId) implements TransferOutcome {
	}

	/**
	 * 상대가 요청을 받고 거절했다. 돈은 옮겨지지 않았다.
	 */
	record Rejected(String reasonCode, String reason) implements TransferOutcome {
	}

	/**
	 * 옮겨졌는지 알 수 없다. 되돌리지 말고 그대로 두었다가 다시 물어 확정해야 한다.
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
	 * 성공했을 때의 이체 식별자. 성공이 아니면 null.
	 */
	default String transferIdOrNull() {
		return this instanceof Succeeded s ? s.transferId() : null;
	}
}
