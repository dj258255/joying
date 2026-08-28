package com.joying.payment.service;

import java.time.Duration;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentMethod;
import com.joying.payment.domain.PaymentStatus;
import com.joying.payment.domain.PaymentType;
import com.joying.payment.dto.request.PaymentConfirmRequest;
import com.joying.payment.dto.request.PaymentCreateRequest;
import com.joying.payment.dto.response.PaymentCreateResponse;
import com.joying.payment.dto.response.PaymentResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.exception.*;
import com.joying.payment.metrics.PaymentMetrics;
import com.joying.payment.repository.PaymentRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.escrow.domain.Escrow;
import com.joying.wallet.port.TransferOutcome;
import com.joying.payment.port.DepositHoldPort;
import com.joying.wallet.port.MoneyTransferPort;
import com.joying.escrow.repository.EscrowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * 결제 핵심 비즈니스 로직
 * - 멱등성 보장 (orderId 기반)
 * - 동시성 제어 (Pessimistic Lock)
 * - 재시도 전략 (네트워크 오류만)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;
    private final RentalHistoryRepository rentalHistoryRepository;
    private final EscrowRepository escrowRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MoneyTransferPort moneyTransferPort;
    private final DepositHoldPort depositHoldPort;
    private final PaymentMetrics paymentMetrics;

    /** 방금 만든 결제로 볼 시간. 이보다 짧게 다시 오면 같은 주문번호를 돌려준다 */
    @Value("${joying.payment.fresh-window-millis:10000}")
    private long freshWindowMillis;

    /**
     * 1. 결제 생성 (orderId 발급)
     * - 멱등성 보장: 같은 rentalHisId로 중복 생성 방지
     */
    @Transactional
    public PaymentCreateResponse createPayment(PaymentCreateRequest request, Long memberId) {
        log.info("결제 생성 요청: rentalHisId={}, memberId={}, amount={}",
                request.getRentalHisId(), memberId, request.getTotalAmount());

        // 엔티티 조회
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + memberId));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + request.getProductId()));

        // RentalHistory 를 잠그고 조회한다.
        //
        // 아래에서 이미 결제가 있는지 조회해서 판정하는데, 잠그지 않으면 동시에 들어온
        // 두 요청이 둘 다 없다고 읽고 둘 다 넣는다. 16건을 동시에 보내면 결제가 10건
        // 생겼다. 대여 건 하나만 잠그므로 다른 대여의 결제는 그대로 동시에 돈다.
        RentalHistory rentalHistory = rentalHistoryRepository.findByIdWithLock(request.getRentalHisId())
                .orElseThrow(() -> new IllegalArgumentException("대여 내역을 찾을 수 없습니다: " + request.getRentalHisId()));

        // 금액 검증: 채팅을 통한 네고(할인) 고려
        // - 요청 금액이 원래 금액보다 높으면 에러 (과다 청구 방지)
        // - 요청 금액이 원래 금액 이하면 허용 (할인 가능)

        // 대여 일수 계산
        long diffInMillis = rentalHistory.getEndRen().getTime() - rentalHistory.getStartRen().getTime();
        int days = (int) Math.ceil(diffInMillis / (1000.0 * 60 * 60 * 24)) + 1; // +1: 당일 포함

        // 예상 금액 = (일일 요금 × 일수) + 보증금
        Integer expectedAmount = (rentalHistory.getFee() * days) + rentalHistory.getDeposit().intValue();

        if (request.getTotalAmount() > expectedAmount) {
            log.error("결제 금액 초과: expected={} (fee={} × {}days + deposit={}), actual={}",
                    expectedAmount, rentalHistory.getFee(), days, rentalHistory.getDeposit(), request.getTotalAmount());
            paymentMetrics.offHappyPath(PaymentMetrics.AMOUNT_MISMATCH);
            throw new PaymentAmountMismatchException(expectedAmount, request.getTotalAmount());
        }

        // 할인된 경우 로그 기록
        if (request.getTotalAmount() < expectedAmount) {
            log.info("할인 적용됨: original={}, discounted={}, discount={} ({}일 대여)",
                    expectedAmount, request.getTotalAmount(), expectedAmount - request.getTotalAmount(), days);
        }

        // 멱등성 체크: 이미 해당 rentalHisId로 결제가 있으면 확인
        //
        // 잠금 읽기로 한다. 평범한 조회로 하면 앞선 요청이 만들고 커밋한 결제가 보이지
        // 않는다. MySQL 의 기본 격리 수준에서 평범한 조회는 트랜잭션이 처음 읽은 시점의
        // 모습을 계속 보기 때문이다. 위에서 회원과 상품을 먼저 읽으므로 그 시점이 이미
        // 지나 있다.
        Optional<Payment> existingPayment =
                paymentRepository.findActiveByRentalWithLock(request.getRentalHisId())
                .stream()
                .findFirst();

        if (existingPayment.isPresent()) {
            Payment payment = existingPayment.get();

            // 이미 완료된 결제면 그대로 반환
            if (payment.getStatus() == PaymentStatus.DONE) {
                log.warn("이미 완료된 결제: rentalHisId={}, orderId={}", request.getRentalHisId(), payment.getOrderId());
                paymentMetrics.offHappyPath(PaymentMetrics.ALREADY_DONE);
                return PaymentCreateResponse.builder()
                        .paymentId(payment.getPaymentId())
                        .orderId(payment.getOrderId())
                        .totalAmount(payment.getTotalAmount())
                        .build();
            }

            // READY 상태인 경우
            if (payment.getStatus() == PaymentStatus.READY) {

                // 방금 만든 것이면 그대로 돌려준다.
                //
                // 결제 버튼을 두 번 누르거나 응답이 늦어 다시 누른 경우다. 그 짧은
                // 사이에 결제창을 열어 실패까지 다녀올 수는 없으므로, 이 주문번호는
                // 아직 토스에 간 적이 없다. 새로 만들면 누를 때마다 주문번호가 하나씩
                // 버려지고, 실제로 16번 동시에 누르면 결제가 10건 생겼다.
                if (isFreshlyCreated(payment)) {
                    log.info("방금 만든 결제를 그대로 돌려준다: rentalHisId={}, orderId={}",
                            request.getRentalHisId(), payment.getOrderId());
                    // 이 값이 오르면 응답이 느려 사람들이 다시 누르고 있다는 신호다
                    paymentMetrics.offHappyPath(PaymentMetrics.DUPLICATE_SUBMIT);
                    return PaymentCreateResponse.builder()
                            .paymentId(payment.getPaymentId())
                            .orderId(payment.getOrderId())
                            .totalAmount(payment.getTotalAmount())
                            .build();
                }

                // 오래된 것이면 새 주문번호를 만든다.
                //
                // 사용자가 결제창을 닫았다가 다시 온 경우다. 토스는 이미 시도한 적이
                // 있는 주문번호를 다시 받지 않는다(DUPLICATED_ORDER_ID). 그래서 옛
                // 결제를 접고 새 번호를 낸다.
                log.warn("오래된 READY 결제를 접고 새 orderId 생성: rentalHisId={}, oldOrderId={}",
                        request.getRentalHisId(), payment.getOrderId());
                // 이 값이 오르면 사람들이 결제창에서 이탈하고 있다는 신호다
                paymentMetrics.offHappyPath(PaymentMetrics.STALE_RETRY);

                // 기존 Payment 취소 처리
                payment.cancel();

                // 취소를 먼저 DB에 반영한다.
                //
                // Hibernate 는 한 트랜잭션 안에서 INSERT 를 UPDATE 보다 먼저 내보낸다.
                // 그대로 두면 새 결제의 INSERT 가 먼저 나가고, 아직 비워지지 않은 옛
                // 결제의 활성 열쇠와 부딪힌다. 실제로 "Duplicate entry '9001:INITIAL'"
                // 로 떨어졌다.
                paymentRepository.flush();

                // 새로운 orderId로 Payment 생성 (아래 로직 계속)
            }
        }

        // orderId 생성 (UUID 기반, 멱등성 키)
        String orderId = generateOrderId(request.getRentalHisId());

        // Payment 엔티티 생성
        Payment payment = Payment.create(rentalHistory, product, member, PaymentType.INITIAL);
        payment.markReady(orderId, request.getTotalAmount(), Timestamp.valueOf(LocalDateTime.now()));

        // 저장
        //
        // 위에서 대여 건을 잠갔으므로 여기까지 온 것은 하나뿐이다. 제약은 그것과
        // 별개로 걸어 둔다. 잠그는 것을 잊은 다른 경로가 생겨도 두 건이 되지 않는다.
        //
        // 제약에 걸렸을 때 이미 있는 것을 찾아 돌려주지는 않는다. flush 가 실패하면
        // 영속성 컨텍스트가 망가져 같은 트랜잭션 안에서는 다시 조회할 수 없다.
        // 실제로 해 보니 "has a null identifier" 로 떨어졌다. 되돌리려면 트랜잭션을
        // 새로 열어야 하는데, 잠금으로 막고 있으므로 여기까지 오지 않는다.
        Payment savedPayment = paymentRepository.save(payment);

        rentalHistory.addPayment(savedPayment);
        // ESCROW 상태 변경은 결제 승인(applyConfirm) 시점에 처리
        // rentalHistory.markAsEscrow(); // 제거: createPayment는 orderId만 발급, 아직 결제 안 함
        rentalHistoryRepository.save(rentalHistory);

        log.info("결제 생성 완료 및 대여내역 연결: rentalHisId={}, paymentId={}, orderId={}",
                rentalHistory.getRentalHisId(), savedPayment.getPaymentId(), orderId);

        return PaymentCreateResponse.builder()
                .paymentId(savedPayment.getPaymentId())
                .orderId(orderId)
                .totalAmount(request.getTotalAmount())
                .build();
    }

    /**
     * 방금 만들어진 결제인지.
     *
     * <p>기준을 시간으로 둔 이유는 서버가 결제창이 열렸는지를 알 방법이 없어서다.
     * 토스가 알려 주는 것은 승인 결과뿐이고, 창을 열었다가 닫은 것은 알려 주지 않는다.
     *
     * <p>기준보다 짧으면 아직 창을 열지도 못했다고 본다. 길게 잡으면 진짜 재시도가
     * 옛 주문번호를 받아 토스에서 거절당하고, 짧게 잡으면 두 번 누른 것이 새 번호를
     * 받아 주문번호가 버려진다.
     */
    private boolean isFreshlyCreated(Payment payment) {
        if (payment.getRequestedAt() == null) {
            return false;
        }
        long elapsedMillis = System.currentTimeMillis() - payment.getRequestedAt().getTime();
        return elapsedMillis >= 0 && elapsedMillis < freshWindowMillis;
    }

    /**
     * 2-1. 결제 승인 준비 — 토스를 부르기 전에 볼 것만 본다.
     *
     * <p>읽기만 하고 행을 잠그지 않는다. 여기서 잠그면 뒤따르는 토스 왕복이 끝날
     * 때까지 행과 DB 커넥션을 함께 붙잡는다. 커넥션은 결제 전용이 아니라 앱 전체가
     * 30개를 나눠 쓰므로, 토스가 느려지면 결제와 상관없는 조회까지 같이 막힌다.
     *
     * @return 이미 승인된 결제. 있으면 토스를 부르지 않고 그대로 돌려준다
     */
    @Transactional(readOnly = true)
    public Optional<PaymentResponse> prepareConfirm(PaymentConfirmRequest request) {
        Payment payment = paymentRepository.findByOrderId(request.getOrderId())
                .orElseThrow(() -> new PaymentNotFoundException(request.getOrderId(), "orderId"));

        // 이미 승인됨 (멱등성 보장)
        if (payment.getStatus() == PaymentStatus.DONE) {
            log.warn("이미 승인된 결제: orderId={}", request.getOrderId());
            return Optional.of(convertToResponse(payment));
        }

        // 금액 검증 (변조 방지)
        if (!payment.getTotalAmount().equals(request.getAmount())) {
            throw new PaymentAmountMismatchException(payment.getTotalAmount(), request.getAmount());
        }

        return Optional.empty();
    }

    /**
     * 2-2. 토스가 돌려준 승인 결과를 반영한다.
     *
     * <p>여기서 처음 행을 잠근다. 잠근 뒤 커밋할 때까지 밖으로 나가는 호출이 없다.
     *
     * <p>준비 단계에서 잠그지 않았으므로 그 사이에 다른 요청이 같은 결제를 먼저
     * 승인해 두었을 수 있다. 그래서 반영하기 전에 다시 본다.
     */
    @Transactional
    public PaymentResponse applyConfirm(PaymentConfirmRequest request, TossConfirmResponse tossResponse) {
        // Pessimistic Lock으로 조회 (동시성 제어)
        Payment payment = paymentRepository.lockByOrderId(request.getOrderId())
                .orElseThrow(() -> new PaymentNotFoundException(request.getOrderId(), "orderId"));

        // 잠그기 전에 다른 요청이 먼저 승인했는지 다시 본다.
        //
        // 준비 단계에서 잠그지 않기로 했으므로, 토스에 묻는 동안 같은 결제에 대한
        // 다른 요청이 들어와 먼저 승인을 끝냈을 수 있다. 그대로 두면 아래
        // completePaymentApproval 에서 payment.approve() 가 두 번 돌고 대여료가
        // 두 번 적립된다. 돈이 두 번 움직인다.
        //
        // 성공으로 돌려준다. 이 요청도 토스에서 승인을 받았고, 결제는 실제로 되어
        // 있다. 호출한 쪽이 알아야 할 것은 승인이 됐다는 사실이지 누가 먼저
        // 반영했는지가 아니다. 다만 조용히 넘기면 이 경합이 얼마나 나는지 알 수
        // 없으므로 세어 둔다.
        //
        // 상태만 보고 paymentKey 까지 대조하지는 않는다. 주문번호로 잠근 행에 다른
        // 결제의 응답이 들어오려면 토스가 orderId 를 잘못 짝지어야 하는데, 그런 일이
        // 나는지 재 본 적이 없다. 재기 전에는 막지 않는다.
        if (payment.getStatus() == PaymentStatus.DONE) {
            log.warn("승인 도중 다른 요청이 먼저 승인했다: orderId={}", request.getOrderId());
            paymentMetrics.confirmOffHappyPath(PaymentMetrics.CONCURRENT_CONFIRM);
            return convertToResponse(payment);
        }

        // Payment 상태 업데이트 및 Escrow 생성 (공통 로직)
        completePaymentApproval(payment, tossResponse);

        log.info("결제 승인 완료: paymentId={}, orderId={}", payment.getPaymentId(), request.getOrderId());

        // 결제 완료 채팅 메시지 전송 (비동기)
        sendPaymentCompleteMessage(payment);

        escrowRepository.findByPayment_PaymentId(payment.getPaymentId())
                .ifPresent(escrow -> {
                    escrow.startRental();
                    log.info("Escrow 상태 변경: escrowId={}, status={}", escrow.getHoldId(), escrow.getStatus());
                });

        return convertToResponse(payment);
    }

    /**
     * 3. 결제 상세 조회
     * - 권한 검증: 본인의 결제만 조회 가능
     * - Redis 캐싱: 5분 TTL
     */
    @Cacheable(value = "payments", key = "#orderId")
    public PaymentResponse getPayment(String orderId, Long requestMemberId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

        // 권한 검증
        validatePaymentAccess(payment, requestMemberId);

        return convertToResponse(payment);
    }

    /**
     * 4-1. 결제 취소 준비 — 토스를 부르기 전에 볼 것만 본다.
     *
     * <p>승인과 같은 이유로 잠그지 않는다. 여기서 잠그면 뒤따르는 토스 왕복이 끝날
     * 때까지 행과 DB 커넥션을 함께 붙잡는다.
     */
    @Transactional(readOnly = true)
    public CancelPlan prepareCancel(String orderId, Long requestMemberId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

        // 권한 검증
        validatePaymentAccess(payment, requestMemberId);

        // 이미 취소됨 (멱등성 보장)
        if (payment.getStatus() == PaymentStatus.CANCELED) {
            log.warn("이미 취소된 결제: orderId={}", orderId);
            return new CancelPlan.AlreadyCanceled(convertToResponse(payment));
        }

        // 취소 가능 상태 확인
        if (payment.getStatus() != PaymentStatus.DONE) {
            throw new PaymentStateException(payment.getStatus(), PaymentStatus.DONE);
        }

        return new CancelPlan.AskToss(payment.getPaymentKey());
    }

    /**
     * 4-2. 토스가 받아들인 취소를 반영한다.
     *
     * <p>여기서 처음 행을 잠근다. 잠근 뒤 커밋할 때까지 밖으로 나가는 호출이 없다.
     *
     * <p>토스 응답을 받지 않는 것은 예전에도 쓰지 않았기 때문이다. 취소는 받아들여
     * 졌는지 아닌지만 의미가 있고, 거절되면 그 자리에서 예외가 오른다.
     */
    @Transactional
    public PaymentResponse applyCancel(String orderId) {
        // Pessimistic Lock으로 조회
        Payment payment = paymentRepository.lockByOrderId(orderId)
                .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

        // 잠그기 전에 다른 요청이 먼저 취소했는지 다시 본다. 승인과 같은 이유다.
        // 그대로 두면 payment.cancel() 이 두 번 돌고 Escrow 취소가 다시 일어난다.
        if (payment.getStatus() == PaymentStatus.CANCELED) {
            log.warn("취소 도중 다른 요청이 먼저 취소했다: orderId={}", orderId);
            paymentMetrics.cancelOffHappyPath(PaymentMetrics.CONCURRENT_CANCEL);
            return convertToResponse(payment);
        }

        // Payment 상태 업데이트
        payment.cancel();

        // RentalHistory 상태 업데이트 (취소)
        RentalHistory rentalHistory = payment.getRentalHistory();
        rentalHistory.cancel();

        // Escrow 취소
        escrowRepository.findByPayment_PaymentId(payment.getPaymentId())
                .ifPresent(escrow -> {
                    escrow.cancel();
                    log.info("Escrow 취소: escrowId={}", escrow.getHoldId());
                });

        log.info("결제 취소 완료: paymentId={}, orderId={}", payment.getPaymentId(), orderId);

        return convertToResponse(payment);
    }

    /**
     * 5. 결제 금액 조회
     * - 권한 검증: 본인의 결제만 조회 가능
     * - Redis 캐싱: 5분 TTL
     */
    @Cacheable(value = "paymentAmounts", key = "#orderId")
    public Integer getPaymentAmount(String orderId, Long requestMemberId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

        // 권한 검증
        validatePaymentAccess(payment, requestMemberId);

        return payment.getTotalAmount();
    }

    /**
     * orderId 생성 (멱등성 키)
     * 형식: JOYING_{rentalHisId}_{UUID}
     */
    private String generateOrderId(Long rentalHisId) {
        return String.format("JOYING_%d_%s", rentalHisId, UUID.randomUUID().toString().substring(0, 8));
    }

    /**
     * 권한 검증: 요청한 사용자가 결제의 소유자인지 확인
     */
    private void validatePaymentAccess(Payment payment, Long requestMemberId) {
        if (!payment.getMember().getMemberId().equals(requestMemberId)) {
            throw new com.joying.payment.exception.PaymentAccessDeniedException(
                payment.getOrderId(),
                requestMemberId,
                payment.getMember().getMemberId()
            );
        }
    }

    /**
     * 결제 승인 완료 처리 (공통 로직)
     * - applyConfirm에서만 부른다. 웹훅은 자기 경로로 따로 처리한다
     * - PaymentType에 따라 다른 처리 (INITIAL: Escrow 생성, EXTENSION: 연장 처리)
     */
    private void completePaymentApproval(Payment payment, TossConfirmResponse tossResponse) {
        // approvedAt 파싱 (ISO 8601 형식 → Timestamp)
        Timestamp approvedAt = parseApprovedAt(tossResponse.getApprovedAt());

        // Payment 상태 업데이트
        payment.approve(
                tossResponse.getPaymentKey(),
                PaymentMethod.fromTossMethod(tossResponse.getMethod()),
                approvedAt,
                tossResponse.getReceiptUrl()
        );

        RentalHistory rentalHistory = payment.getRentalHistory();

        // PaymentType에 따라 분기 처리
        // 대여 기간이 보증금을 붙잡아 둘 수 있는 기간을 넘으면 받지 않는다.
        //
        // 반납 시점에 카드를 건드릴 수 없으면 보증금을 돌려줄 방법이 사라진다. 그때
        // 남는 선택지는 우리가 대신 보내는 것뿐이고, 그것을 피하려고 이 구조를 만들었다.
        // 그래서 결제를 받기 전에 막는다. 기술이 아니라 서비스가 정하는 상한이다.
        rejectIfRentalPeriodExceedsHoldLimit(rentalHistory);

        if (payment.getPaymentType() == PaymentType.INITIAL) {
            // 최초 결제: RentalHistory 상태 업데이트 (ESCROW) + Escrow 생성
            rentalHistory.markAsEscrow();

            // Escrow 생성 (보증금 예치) - 중복 생성 방지
            if (escrowRepository.findByPayment_PaymentId(payment.getPaymentId()).isEmpty()) {
                Integer depositAmount = rentalHistory.getDeposit().intValue();  // 보증금
                Integer totalRentalFee = payment.getTotalAmount() - depositAmount;  // 전체 대여료 (결제금액 - 보증금)

                // 금융망 입금이 확정되기 전이므로 PENDING으로 만들어 먼저 저장한다.
                // 이 행이 있어야 입금 결과가 미확정으로 남았을 때 나중에 찾아서 확정할 수 있다.
                Escrow escrow = Escrow.createPending(rentalHistory, payment, totalRentalFee, depositAmount);
                escrowRepository.save(escrow);
                log.info("Escrow 생성 완료: escrowId={}, paymentId={}, rentalFee={}, deposit={}",
                        escrow.getHoldId(), payment.getPaymentId(), totalRentalFee, depositAmount);

                // 대여료만 중개 장부에 적립한다.
                //
                // 예전에는 보증금까지 전액을 적립했다. 보증금은 얼마를 돌려줄지가 나중에
                // 정해지는 돈이라, 우리 장부로 옮기는 순간 우리가 책임지는 돈이 된다.
                // 그리고 그것을 대여자에게 보내는 일이 정산 대행이 되어 전자지급결제
                // 대행업 등록 대상이 된다.
                //
                // 보증금은 결제에 그대로 남겨 두고 금액만 기록한다. 반납이 확정되면
                // 카드에서 직접 풀거나 배상액만 확정한다. 플랫폼 장부를 지나지 않는다.
                long rentalFeeAmount = totalRentalFee.longValue();

                // 주문번호를 참조로 쓴다. 같은 주문으로 두 번 불러도 돈은 한 번만 움직인다.
                TransferOutcome outcome = moneyTransferPort.creditToEscrow(
                        rentalFeeAmount,
                        "rental-fee-" + payment.getOrderId(),
                        "대여료 적립 (orderId: " + payment.getOrderId() + ")"
                );

                if (outcome instanceof TransferOutcome.Succeeded succeeded) {
                    escrow.markHeld(succeeded.transferId());
                    log.info("[대여료 적립 완료] rentalHisId={}, transferId={}, amount={}, via={}",
                            rentalHistory.getRentalHisId(), succeeded.transferId(),
                            rentalFeeAmount, moneyTransferPort.name());

                } else if (outcome instanceof TransferOutcome.Rejected rejected) {
                    // 상대가 요청을 받고 거절했다. 돈은 옮겨지지 않은 것이 확정이므로,
                    // 이미 승인된 토스 결제를 되돌리는 것이 맞다.
                    //
                    // 되돌리는 것은 여기서 하지 않는다. 토스에 취소를 묻는 것은 밖으로
                    // 나가는 호출이고, 이 자리는 트랜잭션 안이다. 열쇠만 실어 던지고
                    // 트랜잭션이 되돌아간 뒤 밖에서 취소한다.
                    log.error("[대여료 적립 거절] orderId={}, code={}, reason={}",
                            payment.getOrderId(), rejected.reasonCode(), rejected.reason());
                    throw new DepositCreditRejectedException(
                            tossResponse.getPaymentKey(), rejected.reasonCode());

                } else {
                    // 옮겨졌는지 알 수 없다. 여기서 토스 결제를 취소하면 실제로 적립이
                    // 성공했을 때 고객 돈만 돌아간다. 되돌리지 않고 PENDING으로 남긴다.
                    TransferOutcome.Unconfirmed unconfirmed = (TransferOutcome.Unconfirmed) outcome;
                    log.warn("[대여료 적립 미확정 - 재조회 대상] orderId={}, escrowId={}, amount={}, reason={}",
                            payment.getOrderId(), escrow.getHoldId(), rentalFeeAmount,
                            unconfirmed.reason());
                }
            }

        } else if (payment.getPaymentType() == PaymentType.EXTENSION) {
            // 연장 결제: RentalHistory.extend() 호출
            if (payment.getExtensionEndDate() == null) {
                log.error("연장 결제인데 extensionEndDate가 null입니다: paymentId={}", payment.getPaymentId());
                throw new IllegalStateException("연장 종료일 정보가 없습니다");
            }

            rentalHistory.extend(payment.getExtensionEndDate(), payment.getTotalAmount());
            log.info("대여 기간 연장 완료: rentalHisId={}, newEndDate={}, additionalFee={}, extensionCount={}",
                    rentalHistory.getRentalHisId(),
                    payment.getExtensionEndDate(),
                    payment.getTotalAmount(),
                    rentalHistory.getExtensionCount());
        }
    }

    /**
     * Payment -> PaymentResponse 변환
     */
    private PaymentResponse convertToResponse(Payment payment) {
        return PaymentResponse.builder()
                .paymentId(payment.getPaymentId())
                .orderId(payment.getOrderId())
                .paymentKey(payment.getPaymentKey())
                .status(payment.getStatus().name())
                .method(payment.getMethod() != null ? payment.getMethod().name() : null)
                .totalAmount(payment.getTotalAmount())
                .receiptUrl(payment.getReceiptUrl())
                .approvedAt(payment.getApprovedAt() != null ? payment.getApprovedAt().toString() : null)
                .build();
    }

    /**
     * 토스 API의 ISO 8601 형식 날짜를 Timestamp로 변환
     * @param approvedAtString ISO 8601 형식 문자열 (예: "2025-11-13T00:18:53+09:00")
     * @return Timestamp
     */
    private Timestamp parseApprovedAt(String approvedAtString) {
        try {
            // ISO 8601 형식 파싱 (타임존 포함)
            ZonedDateTime zonedDateTime = ZonedDateTime.parse(approvedAtString, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            // LocalDateTime으로 변환 (타임존 제거)
            LocalDateTime localDateTime = zonedDateTime.toLocalDateTime();
            // Timestamp로 변환
            return Timestamp.valueOf(localDateTime);
        } catch (Exception e) {
            log.error("approvedAt 파싱 실패: {}", approvedAtString, e);
            throw new IllegalArgumentException("잘못된 날짜 형식입니다: " + approvedAtString, e);
        }
    }

    /**
     * 결제 완료 이벤트 발행
     */
    private void sendPaymentCompleteMessage(Payment payment) {
        try {
            RentalHistory rentalHistory = payment.getRentalHistory();
            Product product = payment.getProduct();

            // 결제 완료 이벤트 발행 (이벤트 리스너에서 채팅 메시지 전송)
            PaymentCompletedEvent event = new PaymentCompletedEvent(
                payment.getPaymentId(),
                payment.getOrderId(),
                payment.getTotalAmount(),
                rentalHistory.getRentalHisId(),
                product.getProductId(),
                rentalHistory.getMember().getMemberId(), // buyerId
                product.getWriter().getMemberId() // sellerId
            );

            eventPublisher.publishEvent(event);
            log.info("[결제 완료 이벤트 발행] paymentId={}, rentalHisId={}",
                payment.getPaymentId(), rentalHistory.getRentalHisId());

        } catch (Exception e) {
            // 이벤트 발행 실패해도 결제는 성공이므로 로그만 남김
            log.error("[결제 완료 이벤트 발행 실패] paymentId={}", payment.getPaymentId(), e);
        }
    }

    /**
     * 결제 완료 이벤트
     */
    public static class PaymentCompletedEvent {
        private final Long paymentId;
        private final String orderId;
        private final Integer amount;
        private final Long rentalHisId;
        private final Long productId;
        private final Long buyerId;
        private final Long sellerId;

        public PaymentCompletedEvent(Long paymentId, String orderId, Integer amount,
                                     Long rentalHisId, Long productId, Long buyerId, Long sellerId) {
            this.paymentId = paymentId;
            this.orderId = orderId;
            this.amount = amount;
            this.rentalHisId = rentalHisId;
            this.productId = productId;
            this.buyerId = buyerId;
            this.sellerId = sellerId;
        }

        public Long getPaymentId() { return paymentId; }
        public String getOrderId() { return orderId; }
        public Integer getAmount() { return amount; }
        public Long getRentalHisId() { return rentalHisId; }
        public Long getProductId() { return productId; }
        public Long getBuyerId() { return buyerId; }
        public Long getSellerId() { return sellerId; }
    }

    /**
     * 대여 기간이 보증금 보류 한도를 넘으면 결제를 막는다.
     *
     * <p>승인일로부터 매입을 요청할 수 있는 기간이 정해져 있어, 그보다 긴 대여는 반납
     * 시점에 카드를 건드릴 수 없다.
     */
    private void rejectIfRentalPeriodExceedsHoldLimit(RentalHistory rentalHistory) {
        if (rentalHistory.getStartRen() == null || rentalHistory.getEndRen() == null) {
            return;
        }
        long days = Duration.between(
                rentalHistory.getStartRen().toInstant(),
                rentalHistory.getEndRen().toInstant()).toDays();
        int limit = depositHoldPort.holdLimitDays();
        if (days > limit) {
            log.warn("[대여 기간 초과] rentalHisId={}, days={}, limit={}",
                    rentalHistory.getRentalHisId(), days, limit);
            throw new IllegalStateException(
                    "대여 기간이 " + limit + "일을 넘어 결제할 수 없습니다: " + days + "일");
        }
    }

}
