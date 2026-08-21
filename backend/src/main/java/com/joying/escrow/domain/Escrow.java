package com.joying.escrow.domain;

import com.joying.payment.domain.Payment;
import com.joying.rental.domain.RentalHistory;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
@Entity
@Table(name = "escrow")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "holdId", callSuper = false)
public class Escrow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hold_id")
    private Long holdId;

    @Comment("거래 내역 ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id",nullable = false)
    private RentalHistory rentalHistory;

    @Comment("결제 ID")
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false, unique=true)
    private Payment payment;

    @Comment("대여료")
    @Column(name = "rental_fee")
    private Integer rentalFee;

    @Comment("보증료")
    @Column(name="deposit_amount")
    private Integer depositAmount;

    @Comment("총 홀드 금액")
    @Column(name="total_amount")
    private Integer totalAmount;

    @Comment("상태 관리")
    @Enumerated(EnumType.STRING)
    @Column(name="status")
    private Status status;

    @Comment("생성 시각")
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;

    @Comment("에스크로 적립 이체 식별자. 있으면 돈이 실제로 들어온 것이다")
    @Column(name = "deposit_tx_no")
    private String depositTxNo;

    @Comment("대여료 지급 이체 식별자. 있으면 이미 나간 것이므로 다시 보내지 않는다")
    @Column(name = "rental_fee_tx_no")
    private String rentalFeeTxNo;

    @Comment("보증금 반환 이체 식별자. 있으면 이미 나간 것이므로 다시 보내지 않는다")
    @Column(name = "deposit_return_tx_no")
    private String depositReturnTxNo;

    @Comment("대여료지급 일시")
    @Column(name = "rental_fee_released_at")
    private Timestamp rentalFeeReleasedAt;

    @Comment("보증금 반환 일시")
    @Column(name = "deposit_returned_at")
    private Timestamp depositReturnedAt;

    /**
     * Escrow 생성 (토스 결제 승인 직후, 금융망 입금 전)
     *
     * @param rentalHistory 거래 내역
     * @param payment       결제 정보
     * @param rentalFee     대여료
     * @param depositAmount 보증금
     * @return Escrow 엔티티
     */
    public static Escrow createPending(RentalHistory rentalHistory,
                                     Payment payment,
                                     Integer rentalFee,
                                     Integer depositAmount) {
        Escrow escrow = new Escrow();
        escrow.rentalHistory = rentalHistory;
        escrow.payment = payment;
        escrow.rentalFee = rentalFee;
        escrow.depositAmount = depositAmount;
        escrow.totalAmount = rentalFee + depositAmount;
        escrow.status = Status.PENDING;  // 적립이 확정되기 전
        return escrow;
    }

    /**
     * 적립이 성공으로 확정됐다. 이체 식별자를 남기고 예치중으로 옮긴다.
     */
    public void markHeld(String depositTxNo) {
        if (this.status != Status.PENDING) {
            throw new IllegalStateException("PENDING 상태에서만 예치로 옮길 수 있습니다.");
        }
        this.depositTxNo = depositTxNo;
        this.status = Status.HELD;
    }

    /**
     * 적립이 아직 확정되지 않았는지. PENDING으로 남아 있으면 돈이 들어오지 않은 것이다.
     */
    public boolean isDepositUnconfirmed() {
        return this.status == Status.PENDING;
    }

    /**
     * 대여 시작 (수령 확정)
     */
    public void startRental() {
        if (this.status != Status.HELD) {
            throw new IllegalStateException("HELD 상태에서만 대여를 시작할 수 있습니다.");
        }
        this.status = Status.RENTAL_STARTED;
    }

    /**
     * 반납 시작
     */
    public void startReturn() {
        if (this.status != Status.RENTAL_STARTED) {
            throw new IllegalStateException("RENTAL_STARTED 상태에서만 반납을 시작할 수 있습니다.");
        }
        this.status = Status.RETURN_STARTED;
    }

    /**
     * 대여료 지급
     */
    public void releaseRentalFee(Timestamp releasedAt) {
        this.rentalFeeReleasedAt = releasedAt;
    }

    /**
     * 대여료 지급이 성공으로 확정됐다. 거래고유번호를 남긴다.
     *
     * <p>이 번호가 남아 있으면 이미 나간 돈이다. 정산을 다시 돌려도 이 단계는 건너뛴다.
     * 순차로 나가는 송금 중 뒤엣것이 실패했을 때 앞엣것을 다시 보내지 않기 위한 표식이다.
     */
    public void markRentalFeeSent(String transactionUniqueNo, Timestamp releasedAt) {
        this.rentalFeeTxNo = transactionUniqueNo;
        this.rentalFeeReleasedAt = releasedAt;
    }

    /**
     * 보증금 반환이 성공으로 확정됐다. 거래고유번호를 남긴다.
     */
    public void markDepositReturned(String transactionUniqueNo, Timestamp returnedAt) {
        this.depositReturnTxNo = transactionUniqueNo;
        this.depositReturnedAt = returnedAt;
    }

    /**
     * 대여료가 이미 나갔는지. 참이면 다시 보내면 안 된다.
     */
    public boolean isRentalFeeSent() {
        return this.rentalFeeTxNo != null;
    }

    /**
     * 보증금이 이미 반환됐는지. 참이면 다시 보내면 안 된다.
     */
    public boolean isDepositReturned() {
        return this.depositReturnTxNo != null;
    }

    /**
     * 보증금 반환
     */
    public void returnDeposit(Timestamp returnedAt) {
        this.depositReturnedAt = returnedAt;
    }

    /**
     * 전액 환불
     */
    public void refund() {
        this.status = Status.REFUNDED;
    }

    /**
     * 취소
     */
    public void cancel() {
        this.status = Status.CANCELLED;
    }

    /**
     * 정산 완료 (대여료 지급 + 보증금 반환)
     */
    public void settle() {
        if (this.status != Status.RETURN_STARTED && this.status != Status.RENTAL_STARTED) {
            throw new IllegalStateException("RETURN_STARTED 또는 RENTAL_STARTED 상태에서만 정산할 수 있습니다");
        }

        Timestamp now = new Timestamp(System.currentTimeMillis());

        // 대여료 지급 시점 기록
        if (this.rentalFeeReleasedAt == null) {
            this.rentalFeeReleasedAt = now;
        }

        // 보증금 반환 시점 기록
        if (this.depositReturnedAt == null) {
            this.depositReturnedAt = now;
        }

        this.status = Status.SETTLED;
    }
}
