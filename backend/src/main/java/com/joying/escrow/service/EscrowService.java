package com.joying.escrow.service;

import com.joying.account.domain.Account;
import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.dto.request.EscrowCreateRequest;
import com.joying.escrow.dto.response.EscrowResponse;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.member.domain.Member;
import com.joying.payment.domain.Payment;
import com.joying.payment.repository.PaymentRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.ssafy.service.FinanceApiService;
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
    private final FinanceApiService financeApiService;
    private final FinanceApiProperties financeApiProperties;

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

        RentalHistory rental = escrow.getRentalHistory();

        // 1. 대여자(lender) 계좌 조회
        Member lender = rental.getRentalProduct().getWriter();
        Account lenderAccount = lender.getAccounts().stream()
                .filter(Account::isUsable)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("대여자의 사용 가능한 계좌가 없습니다: memberId=" + lender.getMemberId()));

        // 2. 차용자(renter) 계좌 조회
        Member renter = rental.getMember();
        Account renterAccount = renter.getAccounts().stream()
                .filter(Account::isUsable)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("차용자의 사용 가능한 계좌가 없습니다: memberId=" + renter.getMemberId()));

        // 3. Joying 중개 계좌 정보
        String escrowAccountNo = financeApiProperties.getEscrow().getAccountNo();
        String escrowUserKey = financeApiProperties.getEscrow().getUserKey();

        // 4. SSAFY 금융망으로 대여료 지급 (Joying 중개 계좌 → 대여자)
        try {
            String rentalFeeTxNo = financeApiService.transferMoney(
                    escrowAccountNo,
                    lenderAccount.getAccountNo(),
                    escrow.getRentalFee().longValue(),
                    "Joying 대여료 지급",
                    escrowUserKey
            );
            log.info("[대여료 지급 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                    rental.getRentalHisId(), rentalFeeTxNo, escrow.getRentalFee(), lenderAccount.getAccountNo());
        } catch (Exception e) {
            log.error("[대여료 지급 실패] rentalHisId={}, lenderMemberId={}",
                    rental.getRentalHisId(), lender.getMemberId(), e);
            throw new IllegalStateException("대여료 지급 중 오류가 발생했습니다", e);
        }

        // 5. SSAFY 금융망으로 보증금 반환 (Joying 중개 계좌 → 차용자)
        try {
            String depositTxNo = financeApiService.transferMoney(
                    escrowAccountNo,
                    renterAccount.getAccountNo(),
                    escrow.getDepositAmount().longValue(),
                    "Joying 보증금 반환",
                    escrowUserKey
            );
            log.info("[보증금 반환 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                    rental.getRentalHisId(), depositTxNo, escrow.getDepositAmount(), renterAccount.getAccountNo());
        } catch (Exception e) {
            log.error("[보증금 반환 실패] rentalHisId={}, renterMemberId={}",
                    rental.getRentalHisId(), renter.getMemberId(), e);
            throw new IllegalStateException("보증금 반환 중 오류가 발생했습니다", e);
        }

        // 6. Escrow 상태 변경 (HELD → SETTLED)
        escrow.settle();

        // 7. RentalHistory 상태 업데이트 (RETURNED → DEPOSIT_RETURNED)
        rental.complete();

        log.info("[정산 완료] holdId={}, status={}", holdId, escrow.getStatus());

        return convertToResponse(escrow);
    }
}
