package com.joying.escrow.service;

import java.sql.Timestamp;
import java.time.Instant;
import com.joying.account.domain.Account;
import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.escrow.domain.Escrow;
import com.joying.ssafy.dto.TransferOutcome;
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
        // 이 경로도 금융망 입금을 하지 않으므로 예치 완료를 주장하지 않는다.
        Escrow escrow = Escrow.createPending(
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
        //
        // 송금 두 건이 순차로 나간다. 예전에는 뒤엣것이 실패하면 예외를 던져 트랜잭션을
        // 되돌렸는데, 롤백은 DB만 되돌리고 이미 나간 돈은 되돌리지 못한다. 그 상태로
        // 정산을 다시 돌리면 앞엣것이 한 번 더 나갔다.
        //
        // 그래서 확정된 송금은 거래고유번호를 남겨 두고, 다시 돌 때 그 단계를 건너뛴다.
        // 확정한 뒤에는 예외를 던지지 않는다. 던지면 방금 남긴 기록까지 같이 사라진다.
        if (!escrow.isRentalFeeSent()) {
            TransferOutcome outcome = financeApiService.transferMoney(
                    escrowAccountNo,
                    lenderAccount.getAccountNo(),
                    escrow.getRentalFee().longValue(),
                    "Joying 대여료 지급",
                    escrowUserKey
            );

            if (outcome instanceof TransferOutcome.Succeeded succeeded) {
                escrow.markRentalFeeSent(succeeded.transactionUniqueNo(),
                        Timestamp.from(Instant.now()));
                log.info("[대여료 지급 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                        rental.getRentalHisId(), succeeded.transactionUniqueNo(),
                        escrow.getRentalFee(), lenderAccount.getAccountNo());
            } else {
                log.error("[대여료 지급 미완료 - 정산 중단] holdId={}, rentalHisId={}, outcome={}",
                        holdId, rental.getRentalHisId(), outcome);
                return convertToResponse(escrow);
            }
        }

        // 5. SSAFY 금융망으로 보증금 반환 (Joying 중개 계좌 → 차용자)
        if (!escrow.isDepositReturned()) {
            TransferOutcome outcome = financeApiService.transferMoney(
                    escrowAccountNo,
                    renterAccount.getAccountNo(),
                    escrow.getDepositAmount().longValue(),
                    "Joying 보증금 반환",
                    escrowUserKey
            );

            if (outcome instanceof TransferOutcome.Succeeded succeeded) {
                escrow.markDepositReturned(succeeded.transactionUniqueNo(),
                        Timestamp.from(Instant.now()));
                log.info("[보증금 반환 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                        rental.getRentalHisId(), succeeded.transactionUniqueNo(),
                        escrow.getDepositAmount(), renterAccount.getAccountNo());
            } else {
                // 대여료는 이미 나갔고 그 기록이 남아 있다. 다시 돌리면 여기서부터 이어간다.
                log.error("[보증금 반환 미완료 - 정산 중단] holdId={}, rentalHisId={}, outcome={}",
                        holdId, rental.getRentalHisId(), outcome);
                return convertToResponse(escrow);
            }
        }

        // 6. 두 송금이 모두 확정됐을 때만 정산을 닫는다
        escrow.settle();

        // 7. RentalHistory 상태 업데이트 (RETURNED → DEPOSIT_RETURNED)
        rental.complete();

        log.info("[정산 완료] holdId={}, status={}", holdId, escrow.getStatus());

        return convertToResponse(escrow);
    }
}
