package com.joying.payment.service;

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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
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

        // 멱등성 체크: 이미 해당 rentalHisId로 결제가 있으면 반환
        Optional<Payment> existingPayment = paymentRepository.findByRentalHistory_RentalHisId(request.getRentalHisId())
                .stream()
                .filter(p -> p.getStatus() != PaymentStatus.CANCELED)
                .findFirst();

        if (existingPayment.isPresent()) {
            Payment payment = existingPayment.get();
            log.warn("이미 존재하는 결제: rentalHisId={}, orderId={}", request.getRentalHisId(), payment.getOrderId());
            return PaymentCreateResponse.builder()
                    .paymentId(payment.getPaymentId())
                    .orderId(payment.getOrderId())
                    .totalAmount(payment.getTotalAmount())
                    .build();
        }

        // orderId 생성 (UUID 기반, 멱등성 키)
        String orderId = generateOrderId(request.getRentalHisId());

        // Payment 엔티티 생성
        Payment payment = Payment.create(rentalHistory, product, member, PaymentType.INITIAL);
        payment.markReady(orderId, request.getTotalAmount(), Timestamp.valueOf(LocalDateTime.now()));

        // 저장
        Payment savedPayment = paymentRepository.save(payment);

        log.info("결제 생성 완료: paymentId={}, orderId={}", savedPayment.getPaymentId(), orderId);

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

        // 토스 API 승인 요청
        TossConfirmResponse tossResponse = tossClient.confirm(
                request.getPaymentKey(),
                request.getOrderId(),
                request.getAmount()
        );

        // Payment 상태 업데이트 및 Escrow 생성 (공통 로직)
        completePaymentApproval(payment, tossResponse);

        log.info("결제 승인 완료: paymentId={}, orderId={}", payment.getPaymentId(), request.getOrderId());

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
        // Payment 상태 업데이트
        payment.approve(
                tossResponse.getPaymentKey(),
                PaymentMethod.valueOf(tossResponse.getMethod()),
                Timestamp.valueOf(tossResponse.getApprovedAt()),
                tossResponse.getReceiptUrl()
        );

        RentalHistory rentalHistory = payment.getRentalHistory();

        // PaymentType에 따라 분기 처리
        if (payment.getPaymentType() == PaymentType.INITIAL) {
            // 최초 결제: RentalHistory 상태 업데이트 (ESCROW) + Escrow 생성
            rentalHistory.markAsEscrow();

            // Escrow 생성 (보증금 예치) - 중복 생성 방지
            if (escrowRepository.findByPayment_PaymentId(payment.getPaymentId()).isEmpty()) {
                Integer rentalFee = rentalHistory.getFee();  // 대여료
                Integer depositAmount = rentalHistory.getDeposit().intValue();  // 보증금

                Escrow escrow = Escrow.createHeld(rentalHistory, payment, rentalFee, depositAmount);
                escrowRepository.save(escrow);
                log.info("Escrow 생성 완료: escrowId={}, paymentId={}", escrow.getHoldId(), payment.getPaymentId());
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
}
