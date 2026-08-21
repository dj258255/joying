package com.joying.payment.port;

import com.joying.wallet.port.TransferOutcome;

/**
 * 보증금을 잡아 두고 나중에 풀거나 일부만 확정하는 경계.
 *
 * <p>보증금은 얼마를 돌려줄지가 나중에 정해지는 돈이다. 그래서 결제 시점에 플랫폼
 * 장부로 옮기지 않는다. 옮기는 순간 그 돈은 우리가 책임지는 돈이 되고, 정산에 관여하는
 * 것이 되어 전자지급결제대행업 등록 대상이 된다.
 *
 * <p>카드 결제는 승인과 매입이 나뉘어 있다. 승인만 하면 한도만 잡히고 청구되지 않으며,
 * 매입해야 실제로 가맹점에 돈이 온다. 이 성질을 그대로 쓴다.
 *
 * <ul>
 *   <li>정상 반납이면 승인을 취소한다. 청구된 적이 없으므로 되돌릴 것도 없다.
 *   <li>파손이면 배상액만 확정한다. 나머지는 풀린다.
 * </ul>
 *
 * <p>구현이 둘이다. 수동매입을 쓸 수 있으면 위 설명 그대로 돈다. 쓸 수 없으면 결제
 * 시점에 전액이 매입되므로, 푸는 것이 취소가 되고 확정하는 것이 부분취소가 된다.
 * 부르는 쪽에서 보면 같고, 고객에게 보이는 것만 다르다.
 */
public interface DepositHoldPort {

	/**
	 * 보증금을 통째로 푼다. 정상 반납일 때 부른다.
	 *
	 * @param reference 이 처리를 가리키는 값. 같은 값으로 두 번 불러도 한 번만 처리된다
	 */
	TransferOutcome release(String paymentKey, long depositAmount, String reference, String reason);

	/**
	 * 보증금 중 일부만 확정하고 나머지를 푼다. 파손일 때 부른다.
	 *
	 * @param claimAmount 확정할 금액. 0이면 {@link #release}와 같다
	 */
	TransferOutcome claim(String paymentKey, long depositAmount, long claimAmount,
						  String reference, String reason);

	/**
	 * 이 결제에서 아직 취소되지 않고 남아 있는 금액.
	 *
	 * <p>되돌려 달라고 요청한 것과 카드사에 실제로 반영된 것은 다르다. 부분취소는
	 * 매입 뒤에 도는 절차라 영업일이 걸린다. 요청한 자리에서 완료로 적으면, 반영되지
	 * 않았을 때 고객은 돈을 못 받았는데 우리 기록만 돌려준 것이 된다.
	 *
	 * <p>그래서 확정은 이 값으로 판단한다. 되돌린 만큼 줄어 있으면 반영된 것이다.
	 *
	 * @return 남은 금액. 알 수 없으면 비어 있음
	 */
	java.util.Optional<Long> remainingAmount(String paymentKey);

	/**
	 * 이 구현이 보증금을 어떻게 다루는지. 로그와 운영 화면에서 구분하는 데 쓴다.
	 */
	String name();

	/**
	 * 승인일로부터 이 일수 안에 보증금을 확정하거나 풀어야 한다.
	 *
	 * <p>대여 기간이 이 한도를 넘으면 반납 시점에 카드를 건드릴 수 없다. 그래서 결제를
	 * 받기 전에 막아야 하고, 이 값이 곧 대여 기간의 상한이 된다.
	 */
	int holdLimitDays();
}
