package com.joying.escrow.domain;

import com.joying.payment.domain.Payment;
import com.joying.rental.domain.RentalHistory;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

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

    @Comment("대여료지급 일시")
    @Column(name = "rental_fee_released_at")
    private Timestamp rentalFeeReleasedAt;

    @Comment("보증금 반환 일시")
    @Column(name = "deposit_returned_at")
    private Timestamp depositReturnedAt;

    /**
     * Escrow 생성 (결제 완료 후)
     *
     * @param rentalHistory 거래 내역
     * @param payment       결제 정보
     * @param rentalFee     대여료
     * @param depositAmount 보증금
     * @return Escrow 엔티티
     */
    public static Escrow createHeld(RentalHistory rentalHistory,
                                     Payment payment,
                                     Integer rentalFee,
                                     Integer depositAmount) {
        Escrow escrow = new Escrow();
        escrow.rentalHistory = rentalHistory;
        escrow.payment = payment;
        escrow.rentalFee = rentalFee;
        escrow.depositAmount = depositAmount;
        escrow.totalAmount = rentalFee + depositAmount;
        escrow.status = Status.HELD;  // 홀드 완료(예치중)
        return escrow;
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
}
