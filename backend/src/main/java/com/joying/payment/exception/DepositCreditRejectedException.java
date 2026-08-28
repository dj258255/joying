package com.joying.payment.exception;

/**
 * 대여료 적립이 거절되어 승인을 되돌려야 한다.
 *
 * <p>거절은 돈이 옮겨지지 않은 것이 확정이라는 뜻이다. 그래서 이미 승인된 토스
 * 결제를 되돌리는 것이 맞다. 미확정일 때는 이 예외를 던지지 않는다. 그때 되돌리면
 * 실제로는 옮겨진 돈을 고객에게 돌려주고 에스크로에는 남기게 된다.
 *
 * <p>되돌리는 일을 여기서 하지 않고 예외에 열쇠만 실어 보내는 이유는, 토스에 취소를
 * 묻는 것이 밖으로 나가는 호출이기 때문이다. 트랜잭션 안에서 부르면 그 왕복 동안
 * DB 커넥션을 붙잡는다. 트랜잭션을 되돌린 뒤 밖에서 취소한다.
 *
 * @param paymentKey 되돌릴 토스 결제를 가리키는 값
 */
public class DepositCreditRejectedException extends RuntimeException {

    private final String paymentKey;

    public DepositCreditRejectedException(String paymentKey, String reasonCode) {
        super("대여료 적립이 거절되었습니다: " + reasonCode);
        this.paymentKey = paymentKey;
    }

    public String getPaymentKey() {
        return paymentKey;
    }
}
