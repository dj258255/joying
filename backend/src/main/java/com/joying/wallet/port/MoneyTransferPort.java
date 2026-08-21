package com.joying.wallet.port;


/**
 * 돈을 옮기는 경계.
 *
 * <p>결제, 정산, 환불은 돈이 어디를 거쳐 옮겨지는지 몰라도 된다. 확정됐는지,
 * 거절됐는지, 알 수 없는지만 알면 된다. 그래서 그 셋을 돌려주는 이 포트에만 의존한다.
 *
 * <p>구현이 둘이다. 하나는 외부 금융망을 부르고 하나는 내부 원장에 적는다. 외부를
 * 부르는 쪽은 응답을 못 받는 일이 있어 미확정이 생기지만, 내부 원장은 커밋되거나
 * 롤백되거나 둘뿐이라 미확정이 생기지 않는다. 미확정이라는 상태는 외부 경계가
 * 만든 것이지 이 도메인이 원래 갖고 있던 것이 아니다.
 *
 * <p>모든 메서드는 {@code reference}를 받는다. 같은 참조로 두 번 부르면 돈은 한 번만
 * 움직인다. 재시도와 복구가 이 약속 위에서 돈다.
 */
public interface MoneyTransferPort {

	/**
	 * 밖에서 들어온 돈을 에스크로가 들고 있는 자리에 적는다.
	 *
	 * @param reference 이 적립을 가리키는 값. 주문번호처럼 두 번 생기지 않는 것
	 */
	TransferOutcome creditToEscrow(long amount, String reference, String description);

	/**
	 * 에스크로가 들고 있던 돈을 회원에게 옮긴다.
	 *
	 * @param reference 이 이체를 가리키는 값
	 */
	TransferOutcome transferFromEscrow(Long toMemberId, long amount, String reference, String description);

	/**
	 * 이 구현이 무엇으로 돈을 옮기는지. 로그와 운영 화면에서 구분하는 데 쓴다.
	 */
	String name();
}
