package com.joying.payment.service;

import com.joying.payment.dto.request.PaymentCancelRequest;
import com.joying.payment.dto.request.PaymentConfirmRequest;
import com.joying.payment.dto.response.PaymentResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.exception.DepositCreditRejectedException;
import com.joying.payment.exception.TossPaymentException;
import com.joying.payment.port.TossPaymentsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import java.util.Optional;
import java.util.concurrent.TimeoutException;

/**
 * 토스를 부르는 순서를 잡는 자리.
 *
 * <p>승인과 취소는 모양이 같다. 볼 것을 보고(DB), 토스에 묻고(HTTP), 답을
 * 반영한다(DB).
 *
 * <p>예전에는 셋이 한 트랜잭션 안에 있었다. 토스에 묻는 동안 행 잠금과 DB 커넥션을
 * 계속 붙잡았다. 연결 제한이 5초, 응답 제한이 10초이므로 한 번 묻는 데 최대 15초,
 * 이미 처리된 결제라 다시 조회하는 경로로 빠지면 최대 30초를 잡고 있었다. 커넥션은
 * 결제 전용이 아니라 앱 전체가 30개를 나눠 쓴다. 토스가 느려지면 결제와 상관없는
 * 채팅 조회까지 같이 막힌다.
 *
 * <p>그래서 트랜잭션을 두 개로 자르고 그 사이에서 토스를 부른다. 자르려면 두
 * 트랜잭션을 각각 부르는 자리가 트랜잭션 밖에 있어야 하는데, 같은 클래스 안에서
 * 자기 메서드를 부르면 프록시를 지나지 않아 {@code @Transactional}이 걸리지 않는다.
 * 이 클래스를 따로 둔 이유가 그것이다.
 *
 * <p>{@link PaymentService}는 클래스에 {@code @Transactional(readOnly = true)}가
 * 붙어 있다. 그래서 거기서 어노테이션을 떼는 것만으로는 트랜잭션이 사라지지 않는다.
 * 떼면 클래스에 붙은 것을 물려받아 읽기 전용 트랜잭션이 메서드 전체를 감싸고,
 * 커넥션은 그대로 잡힌다. 트랜잭션이 아예 없는 빈에 두어야 한다. 여기에는 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentTossFlow {

    private final PaymentService paymentService;
    private final TossPaymentsClient tossClient;

    /**
     * 결제 승인 (Toss 결제 완료 후)
     *
     * <p>재시도는 여기에 건다. 토스에 닿지 못했을 때만 다시 부른다. 재시도가
     * 트랜잭션 바깥이므로 백오프로 기다리는 동안에는 커넥션을 잡지 않는다.
     */
    @CacheEvict(value = "payments", key = "#request.orderId")
    @Retryable(
        value = {WebClientRequestException.class, TimeoutException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse confirm(PaymentConfirmRequest request) {
        log.info("결제 승인 요청: orderId={}, paymentKey={}, amount={}",
                request.getOrderId(), request.getPaymentKey(), request.getAmount());

        // 트랜잭션 1: 읽기만 한다. 잠그지 않는다
        Optional<PaymentResponse> alreadyApproved = paymentService.prepareConfirm(request);
        if (alreadyApproved.isPresent()) {
            return alreadyApproved.get();
        }

        // 트랜잭션 밖: 여기서만 밖으로 나간다
        TossConfirmResponse tossResponse = askTossToConfirm(request);

        // 트랜잭션 2: 여기서 처음 잠근다
        try {
            return paymentService.applyConfirm(request, tossResponse);
        } catch (DepositCreditRejectedException e) {
            // 대여료 적립이 거절돼 트랜잭션이 되돌아갔다. DB 에는 아무것도 남지
            // 않았지만 토스에는 승인이 남아 있다. 그것을 여기서 되돌린다.
            //
            // 트랜잭션이 이미 끝난 자리다. 되돌리는 데 시간이 걸려도 커넥션을 잡지
            // 않는다. 예전에는 이 취소가 트랜잭션 안에 있었다.
            cancelForRejectedDeposit(request.getOrderId(), e.getPaymentKey());
            throw e;
        }
    }

    /**
     * 에스크로 입금이 거절돼 토스 결제를 되돌린다.
     *
     * <p>이것마저 실패하면 승인만 남는다. 사람이 봐야 하므로 오류로 남기고 삼킨다.
     * 여기서 다시 던지면 원래 이유인 적립 거절이 가려진다.
     */
    private void cancelForRejectedDeposit(String orderId, String paymentKey) {
        try {
            log.info("[에스크로 입금 실패 - Toss 결제 자동 취소 시도] orderId={}", orderId);
            tossClient.cancel(paymentKey, "대여료 적립 거절");
            log.info("[Toss 결제 취소 완료] orderId={}", orderId);
        } catch (Exception cancelEx) {
            log.error("[Toss 결제 취소 실패 - 수동 처리 필요] orderId={}, paymentKey={}",
                    orderId, paymentKey, cancelEx);
        }
    }

    /**
     * 결제 취소
     *
     * <p>승인과 같은 모양이다.
     */
    @CacheEvict(value = "payments", key = "#orderId")
    @Retryable(
        value = {WebClientRequestException.class, TimeoutException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse cancel(String orderId, PaymentCancelRequest request, Long requestMemberId) {
        log.info("결제 취소 요청: orderId={}, reason={}", orderId, request.getReason());

        // 트랜잭션 1: 읽기만 한다. 잠그지 않는다
        CancelPlan plan = paymentService.prepareCancel(orderId, requestMemberId);
        if (plan instanceof CancelPlan.AlreadyCanceled alreadyCanceled) {
            return alreadyCanceled.response();
        }

        // 트랜잭션 밖: 여기서만 밖으로 나간다
        tossClient.cancel(((CancelPlan.AskToss) plan).paymentKey(), request.getReason());

        // 트랜잭션 2: 여기서 처음 잠근다
        return paymentService.applyCancel(orderId);
    }

    /**
     * 토스에 승인을 묻는다.
     *
     * <p>이미 처리된 결제라고 답하면 조회로 같은 답을 받아 온다. 두 번 눌렀거나
     * 앞선 시도가 토스까지는 닿았던 경우다.
     */
    private TossConfirmResponse askTossToConfirm(PaymentConfirmRequest request) {
        try {
            return tossClient.confirm(
                    request.getPaymentKey(),
                    request.getOrderId(),
                    request.getAmount()
            );

        } catch (TossPaymentException e) {
            if (e.getMessage() == null || !e.getMessage().contains("ALREADY_PROCESSED_PAYMENT")) {
                throw e;  // 다른 에러는 그대로 던진다
            }

            log.warn("이미 처리된 결제 - 토스 API로 결제 정보 조회: orderId={}", request.getOrderId());
            try {
                TossConfirmResponse queried = tossClient.getPaymentByOrderId(request.getOrderId());
                log.info("토스 API 결제 조회 성공: orderId={}, status={}",
                        request.getOrderId(), queried.getStatus());
                return queried;
            } catch (Exception queryEx) {
                log.error("토스 API 결제 조회 실패: orderId={}", request.getOrderId(), queryEx);
                throw e;  // 원래 에러를 다시 던진다
            }
        }
    }
}
