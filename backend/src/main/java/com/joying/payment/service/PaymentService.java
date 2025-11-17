package com.joying.payment.service;

import com.joying.account.domain.Account;
import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentMethod;
import com.joying.payment.domain.PaymentStatus;
import com.joying.payment.domain.PaymentType;
import com.joying.payment.dto.request.PaymentCancelRequest;
import com.joying.payment.dto.request.PaymentConfirmRequest;
import com.joying.payment.dto.request.PaymentCreateRequest;
import com.joying.payment.dto.response.PaymentCreateResponse;
import com.joying.payment.dto.response.PaymentResponse;
import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.exception.*;
import com.joying.payment.port.TossPaymentsClient;
import com.joying.payment.repository.PaymentRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.ssafy.service.FinanceApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeoutException;

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
    private final TossPaymentsClient tossClient;
    private final ApplicationEventPublisher eventPublisher;
    private final FinanceApiService financeApiService;
    private final FinanceApiProperties financeApiProperties;

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

        // RentalHistory 조회
        RentalHistory rentalHistory = rentalHistoryRepository.findById(request.getRentalHisId())
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
            throw new PaymentAmountMismatchException(expectedAmount, request.getTotalAmount());
        }

        // 할인된 경우 로그 기록
        if (request.getTotalAmount() < expectedAmount) {
            log.info("할인 적용됨: original={}, discounted={}, discount={} ({}일 대여)",
                    expectedAmount, request.getTotalAmount(), expectedAmount - request.getTotalAmount(), days);
        }

        // 멱등성 체크: 이미 해당 rentalHisId로 결제가 있으면 확인
        Optional<Payment> existingPayment = paymentRepository.findByRentalHistory_RentalHisId(request.getRentalHisId())
                .stream()
                .filter(p -> p.getStatus() != PaymentStatus.CANCELED) // 취소된 것은 제외
                .findFirst();

        if (existingPayment.isPresent()) {
            Payment payment = existingPayment.get();

            // 이미 완료된 결제면 그대로 반환
            if (payment.getStatus() == PaymentStatus.DONE) {
                log.warn("이미 완료된 결제: rentalHisId={}, orderId={}", request.getRentalHisId(), payment.getOrderId());
                return PaymentCreateResponse.builder()
                        .paymentId(payment.getPaymentId())
                        .orderId(payment.getOrderId())
                        .totalAmount(payment.getTotalAmount())
                        .build();
            }

            // READY 상태인 경우: 새로운 orderId 생성 (이전 결제 시도 실패로 판단)
            if (payment.getStatus() == PaymentStatus.READY) {
                log.warn("READY 상태의 결제 존재 - 새 orderId 생성: rentalHisId={}, oldOrderId={}",
                        request.getRentalHisId(), payment.getOrderId());

                // 기존 Payment 취소 처리
                payment.cancel();

                // 새로운 orderId로 Payment 생성 (아래 로직 계속)
            }
        }

        // orderId 생성 (UUID 기반, 멱등성 키)
        String orderId = generateOrderId(request.getRentalHisId());

        // Payment 엔티티 생성
        Payment payment = Payment.create(rentalHistory, product, member, PaymentType.INITIAL);
        payment.markReady(orderId, request.getTotalAmount(), Timestamp.valueOf(LocalDateTime.now()));

        // 저장
        Payment savedPayment = paymentRepository.save(payment);

        rentalHistory.addPayment(savedPayment);
        // ESCROW 상태 변경은 결제 승인(confirmPayment) 시점에 처리
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
     * 2. 결제 승인 (Toss 결제 완료 후)
     * - 멱등성 보장: 같은 orderId로 여러 번 승인 요청해도 안전
     * - 동시성 제어: Pessimistic Lock
     * - 재시도 가능: 토스 API는 orderId 기반 멱등성 보장
     * - 캐시 삭제: 승인 완료 시 캐시 무효화
     */
    @Transactional
    @CacheEvict(value = "payments", key = "#request.orderId")
    @Retryable(
        value = {WebClientRequestException.class, TimeoutException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse confirmPayment(PaymentConfirmRequest request) {
        log.info("결제 승인 요청: orderId={}, paymentKey={}, amount={}",
                request.getOrderId(), request.getPaymentKey(), request.getAmount());

        // Pessimistic Lock으로 조회 (동시성 제어)
        Payment payment = paymentRepository.lockByOrderId(request.getOrderId())
                .orElseThrow(() -> new PaymentNotFoundException(request.getOrderId(), "orderId"));

        // 이미 승인됨 (멱등성 보장)
        if (payment.getStatus() == PaymentStatus.DONE) {
            log.warn("이미 승인된 결제: orderId={}", request.getOrderId());
            return convertToResponse(payment);
        }

        // 금액 검증 (변조 방지)
        if (!payment.getTotalAmount().equals(request.getAmount())) {
            throw new PaymentAmountMismatchException(payment.getTotalAmount(), request.getAmount());
        }

        TossConfirmResponse tossResponse;

        try {
            // 토스 API 승인 요청
            tossResponse = tossClient.confirm(
                    request.getPaymentKey(),
                    request.getOrderId(),
                    request.getAmount()
            );


        } catch (TossPaymentException e) {
            // "이미 처리된 결제" 에러인 경우 토스 API로 결제 정보 조회
            if (e.getMessage() != null && e.getMessage().contains("ALREADY_PROCESSED_PAYMENT")) {
                log.warn("이미 처리된 결제 - 토스 API로 결제 정보 조회: orderId={}", request.getOrderId());

                try {
                    // 토스 API에서 결제 정보 조회
                    tossResponse = tossClient.getPaymentByOrderId(request.getOrderId());
                    log.info("토스 API 결제 조회 성공: orderId={}, status={}", request.getOrderId(), tossResponse.getStatus());
                } catch (Exception queryEx) {
                    log.error("토스 API 결제 조회 실패: orderId={}", request.getOrderId(), queryEx);
                    throw e; // 원래 에러를 다시 던짐
                }
            } else {
                throw e; // 다른 에러는 그대로 던짐
            }
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
     * 4. 결제 취소
     * - 멱등성 보장: 같은 결제를 여러 번 취소해도 안전
     * - 동시성 제어: Pessimistic Lock
     * - 캐시 삭제: 취소 완료 시 캐시 무효화
     */
    @Transactional
    @CacheEvict(value = "payments", key = "#orderId")
    @Retryable(
        value = {WebClientRequestException.class, TimeoutException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse cancelPayment(String orderId, PaymentCancelRequest request, Long requestMemberId) {
        log.info("결제 취소 요청: orderId={}, reason={}", orderId, request.getReason());

        // Pessimistic Lock으로 조회
        Payment payment = paymentRepository.lockByOrderId(orderId)
                .orElseThrow(() -> new PaymentNotFoundException(orderId, "orderId"));

        // 권한 검증
        validatePaymentAccess(payment, requestMemberId);

        // 이미 취소됨 (멱등성 보장)
        if (payment.getStatus() == PaymentStatus.CANCELED) {
            log.warn("이미 취소된 결제: orderId={}", orderId);
            return convertToResponse(payment);
        }

        // 취소 가능 상태 확인
        if (payment.getStatus() != PaymentStatus.DONE) {
            throw new PaymentStateException(payment.getStatus(), PaymentStatus.DONE);
        }

        // 토스 API 취소 요청
        TossCancelResponse tossResponse = tossClient.cancel(
                payment.getPaymentKey(),
                request.getReason()
        );

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
     * - confirmPayment와 webhook에서 공통으로 사용
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
        if (payment.getPaymentType() == PaymentType.INITIAL) {
            // 최초 결제: RentalHistory 상태 업데이트 (ESCROW) + Escrow 생성
            rentalHistory.markAsEscrow();

            // Escrow 생성 (보증금 예치) - 중복 생성 방지
            if (escrowRepository.findByPayment_PaymentId(payment.getPaymentId()).isEmpty()) {
                Integer depositAmount = rentalHistory.getDeposit().intValue();  // 보증금
                Integer totalRentalFee = payment.getTotalAmount() - depositAmount;  // 전체 대여료 (결제금액 - 보증금)

                Escrow escrow = Escrow.createHeld(rentalHistory, payment, totalRentalFee, depositAmount);
                escrowRepository.save(escrow);
                log.info("Escrow 생성 완료: escrowId={}, paymentId={}, rentalFee={}, deposit={}",
                        escrow.getHoldId(), payment.getPaymentId(), totalRentalFee, depositAmount);

                // 토스 결제 완료 후 Joying 에스크로 계좌로 입금 (SSAFY 금융망)
                // 실제 돈은 토스에 있고, SSAFY 금융망에는 논리적으로만 입금
                try {
                    String escrowAccountNo = financeApiProperties.getEscrow().getAccountNo();
                    String escrowUserKey = financeApiProperties.getEscrow().getUserKey();
                    // 실제 결제 금액 = (일일요금 × 일수) + 보증금 (payment.getTotalAmount()에 저장됨)
                    long totalAmount = payment.getTotalAmount().longValue();

                    // 에스크로 계좌에 입금 (출금 없이 입금만 수행)
                    String txNo = financeApiService.depositMoney(
                            escrowAccountNo,
                            totalAmount,
                            "Toss 결제 에스크로 입금 (orderId: " + payment.getOrderId() + ")",
                            escrowUserKey
                    );

                    log.info("[에스크로 계좌 입금 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                            rentalHistory.getRentalHisId(), txNo, totalAmount, escrowAccountNo);
                } catch (Exception e) {
                    log.error("[에스크로 입금 실패] orderId={}, paymentKey={}",
                             payment.getOrderId(), payment.getPaymentKey(), e);

                    // Toss 결제는 이미 승인되었으므로, 보상 트랜잭션으로 취소 시도
                    try {
                        log.info("[에스크로 입금 실패 - Toss 결제 자동 취소 시도] orderId={}", payment.getOrderId());
                        tossClient.cancel(tossResponse.getPaymentKey(), "에스크로 계좌 입금 실패");
                        log.info("[Toss 결제 취소 완료] orderId={}", payment.getOrderId());
                    } catch (Exception cancelEx) {
                        log.error("[Toss 결제 취소 실패 - 수동 처리 필요] orderId={}, paymentKey={}",
                                 payment.getOrderId(), payment.getPaymentKey(), cancelEx);
                    }

                    // 트랜잭션 롤백을 위해 예외 재발생
                    throw new IllegalStateException("에스크로 계좌 입금에 실패했습니다", e);
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
}
