package com.joying.escrow.service;

import com.joying.escrow.domain.Escrow;
import com.joying.escrow.dto.request.EscrowCreateRequest;
import com.joying.escrow.dto.response.EscrowResponse;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.repository.PaymentRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 에스크로 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EscrowService {

    private final EscrowRepository escrowRepository;
    private final RentalHistoryRepository rentalHistoryRepository;
    private final PaymentRepository paymentRepository;

    /**
     * 에스크로 홀드 생성 (결제 완료 후)
     *
     * @param request 에스크로 생성 요청
     * @return 에스크로 응답
     */
    @Transactional
    public EscrowResponse createHold(EscrowCreateRequest request) {
        log.info("[에스크로 생성] rentalHisId={}, paymentId={}",
                request.getRentalHisId(), request.getPaymentId());

        // 1. RentalHistory 조회
        RentalHistory rental = rentalHistoryRepository.findById(request.getRentalHisId())
                .orElseThrow(() -> new IllegalArgumentException("대여 내역을 찾을 수 없습니다: " + request.getRentalHisId()));

        // 2. Payment 조회
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new IllegalArgumentException("결제 정보를 찾을 수 없습니다: " + request.getPaymentId()));

        // 3. 중복 생성 방지
        if (escrowRepository.findByPayment_PaymentId(payment.getPaymentId()).isPresent()) {
            throw new IllegalStateException("이미 에스크로가 생성되었습니다");
        }

        // 4. Escrow 생성
        Escrow escrow = Escrow.createHeld(
                rental,
                payment,
                rental.getFee(),
                rental.getDeposit().intValue()
        );

        // 5. 저장
        Escrow savedEscrow = escrowRepository.save(escrow);

        // 6. RentalHistory 상태 변경 (PENDING → ESCROW)
        rental.markAsEscrow();

        log.info("[에스크로 생성 완료] holdId={}, status={}", savedEscrow.getHoldId(), savedEscrow.getStatus());

        // 7. 응답 생성
        return convertToResponse(savedEscrow);
    }

    /**
     * 에스크로 상태 조회
     *
     * @param holdId 에스크로 ID
     * @return 에스크로 응답
     */
    public EscrowResponse getEscrow(Long holdId) {
        log.info("[에스크로 조회] holdId={}", holdId);

        Escrow escrow = escrowRepository.findById(holdId)
                .orElseThrow(() -> new IllegalArgumentException("에스크로를 찾을 수 없습니다: " + holdId));

        return convertToResponse(escrow);
    }

    /**
     * Escrow → EscrowResponse 변환
     */
    private EscrowResponse convertToResponse(Escrow escrow) {
        return EscrowResponse.builder()
                .holdId(escrow.getHoldId())
                .rentalHisId(escrow.getRentalHistory().getRentalHisId())
                .paymentId(escrow.getPayment().getPaymentId())
                .status(escrow.getStatus().name())
                .rentalFee(escrow.getRentalFee())
                .depositAmount(escrow.getDepositAmount())
                .totalAmount(escrow.getTotalAmount())
                .rentalFeeReleasedAt(escrow.getRentalFeeReleasedAt() != null ?
                        escrow.getRentalFeeReleasedAt().toLocalDateTime() : null)
                .depositReturnedAt(escrow.getDepositReturnedAt() != null ?
                        escrow.getDepositReturnedAt().toLocalDateTime() : null)
                .build();
    }

    /**
     * 정산 처리 (대여료 지급 + 보증금 반환)
     *
     * @param holdId 에스크로 ID
     * @return 정산 응답
     */
    @Transactional
    public EscrowResponse settleEscrow(Long holdId) {
        log.info("[정산 처리] holdId={}", holdId);

        Escrow escrow = escrowRepository.findById(holdId)
                .orElseThrow(() -> new IllegalArgumentException("에스크로를 찾을 수 없습니다: " + holdId));

        // 정산 처리
        escrow.settle();

        // RentalHistory 상태 업데이트 (RETURNED → DEPOSIT_RETURNED)
        escrow.getRentalHistory().complete();

        log.info("[정산 완료] holdId={}, status={}", holdId, escrow.getStatus());

        return convertToResponse(escrow);
    }
}
