package com.joying.payment.service;

import com.joying.payment.dto.response.PaymentResponse;

/**
 * 취소를 토스에 묻기 전에 확인한 결과.
 *
 * <p>확인은 트랜잭션 안에서 하고 토스 호출은 밖에서 한다. 그 경계를 넘겨야 하는 것이
 * 둘이라 타입으로 나눈다. 이미 취소된 것이면 토스를 부르지 않고 그대로 돌려주고,
 * 아니면 어떤 결제를 취소해 달라고 할지 열쇠를 들고 나간다.
 *
 * <p>{@code Payment} 엔티티를 그대로 내보내지 않는 이유는 트랜잭션이 끝난 뒤에 그
 * 객체를 만지면 지연 로딩이 터지기 때문이다. 필요한 값만 뽑아서 넘긴다.
 */
public sealed interface CancelPlan {

    /**
     * 이미 취소되어 있다. 토스를 부를 것이 없다.
     */
    record AlreadyCanceled(PaymentResponse response) implements CancelPlan {
    }

    /**
     * 토스에 취소를 물어야 한다.
     *
     * @param paymentKey 토스가 이 결제를 가리키는 값
     */
    record AskToss(String paymentKey) implements CancelPlan {
    }
}
