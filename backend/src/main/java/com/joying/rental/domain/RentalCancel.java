package com.joying.rental.domain;

import com.joying.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;

@Getter
@Entity
@Table(name ="rental_cancel")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "cancelId", callSuper = false)
public class RentalCancel {

    @Id
    @Column(name = "cancel_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cancelId;

    @Comment("거래 내역 ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", nullable = false)
    private RentalHistory rentalHistory;

    @Comment("최초 제안자 ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposer_id")
    private Member proposer;

    @Comment("취소 사유")
    @Column(name = "reason")
    private String reason;

    // 합의안(보증금 분배)
    @Comment("보증금 분배 소유자 몫")
    @Column(name = "deposit_owner_amt")
    private Integer depositOwnerAmt;

    @Comment("보증금 분배 구매자 몫")
    @Column(name = "deposit_renter_amt")
    private Integer depositRenterAmt;

    // 상태
    @Comment("요청 상태 (REQUESTED/BOTH_APPROVED/REJECTED/EXPIRED/CANCELLED)")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32)
    private CancelStatus status;

    @Comment("소유자 결정 (PENDING/APPROVE/REJECT)")
    @Enumerated(EnumType.STRING)
    @Column(name = "owner_decision", length = 16)
    private Decision ownerDecision;

    @Comment("소유자 결정 시각")
    @Column(name = "owner_decided_at")
    private Timestamp ownerDecidedAt;

    @Comment("대여자 결정 (PENDING/APPROVE/REJECT)")
    @Enumerated(EnumType.STRING)
    @Column(name = "renter_decision", length = 16)
    private Decision renterDecision;

    @Comment("대여자 결정 시각")
    @Column(name = "renter_decided_at")
    private Timestamp renterDecidedAt;

    @Comment("요청 만료일시")
    @Column(name = "expires_at")
    private Timestamp expiresAt;

    @Comment("차용자 환불 거래고유번호. 있으면 이미 나간 것이므로 다시 보내지 않는다")
    @Column(name = "renter_refund_tx_no")
    private String renterRefundTxNo;

    @Comment("대여자 보증금 분배 거래고유번호. 있으면 이미 나간 것이므로 다시 보내지 않는다")
    @Column(name = "lender_share_tx_no")
    private String lenderShareTxNo;

    @Comment("취소 거래 완료 일시")
    @Column(name = "created_at", nullable = false)
    private Timestamp createdAt;

    /**
     * 취소 요청 생성
     */
    public static RentalCancel create(
            RentalHistory rentalHistory,
            Member proposer,
            String reason,
            Integer depositOwnerAmt,
            Integer depositRenterAmt) {

        RentalCancel cancel = new RentalCancel();
        cancel.rentalHistory = rentalHistory;
        cancel.proposer = proposer;
        cancel.reason = reason;
        cancel.depositOwnerAmt = depositOwnerAmt;
        cancel.depositRenterAmt = depositRenterAmt;
        cancel.status = CancelStatus.PENDING;

        // 제안자가 owner인지 renter인지 판단
        boolean isOwner = rentalHistory.getRentalProduct().getWriter().equals(proposer);
        cancel.ownerDecision = isOwner ? Decision.APPROVE : Decision.PENDING;
        cancel.renterDecision = isOwner ? Decision.PENDING : Decision.APPROVE;

        Timestamp now = Timestamp.valueOf(java.time.LocalDateTime.now());
        cancel.createdAt = now;
        cancel.expiresAt = Timestamp.valueOf(java.time.LocalDateTime.now().plusDays(7));

        if (isOwner) {
            cancel.ownerDecidedAt = now;
        } else {
            cancel.renterDecidedAt = now;
        }

        return cancel;
    }

    /**
     * 승인
     */
    public void approve(Member member) {
        boolean isOwner = rentalHistory.getRentalProduct().getWriter().equals(member);
        Timestamp now = Timestamp.valueOf(java.time.LocalDateTime.now());

        if (isOwner) {
            if (ownerDecision != Decision.PENDING) {
                throw new IllegalStateException("이미 결정하셨습니다");
            }
            ownerDecision = Decision.APPROVE;
            ownerDecidedAt = now;
        } else {
            if (renterDecision != Decision.PENDING) {
                throw new IllegalStateException("이미 결정하셨습니다");
            }
            renterDecision = Decision.APPROVE;
            renterDecidedAt = now;
        }

        // 양측 모두 승인 시
        if (ownerDecision == Decision.APPROVE && renterDecision == Decision.APPROVE) {
            status = CancelStatus.APPROVED;
        }
    }

    /**
     * 거부
     */
    public void reject(Member member, String rejectReason) {
        boolean isOwner = rentalHistory.getRentalProduct().getWriter().equals(member);
        Timestamp now = Timestamp.valueOf(java.time.LocalDateTime.now());

        if (isOwner) {
            if (ownerDecision != Decision.PENDING) {
                throw new IllegalStateException("이미 결정하셨습니다");
            }
            ownerDecision = Decision.REJECT;
            ownerDecidedAt = now;
        } else {
            if (renterDecision != Decision.PENDING) {
                throw new IllegalStateException("이미 결정하셨습니다");
            }
            renterDecision = Decision.REJECT;
            renterDecidedAt = now;
        }

        status = CancelStatus.REJECTED;
        this.reason = rejectReason;
    }

    /**
     * 양측 승인 여부
     */
    /**
     * 차용자 환불이 성공으로 확정됐다. 거래고유번호를 남긴다.
     *
     * <p>이 번호가 남아 있으면 이미 나간 돈이다. 환불을 다시 돌려도 이 단계는 건너뛴다.
     */
    public void markRenterRefundSent(String transactionUniqueNo) {
        this.renterRefundTxNo = transactionUniqueNo;
    }

    /**
     * 대여자 보증금 분배가 성공으로 확정됐다. 거래고유번호를 남긴다.
     */
    public void markLenderShareSent(String transactionUniqueNo) {
        this.lenderShareTxNo = transactionUniqueNo;
    }

    /**
     * 차용자 환불이 이미 나갔는지. 참이면 다시 보내면 안 된다.
     */
    public boolean isRenterRefundSent() {
        return this.renterRefundTxNo != null;
    }

    /**
     * 대여자 보증금 분배가 이미 나갔는지. 참이면 다시 보내면 안 된다.
     */
    public boolean isLenderShareSent() {
        return this.lenderShareTxNo != null;
    }

    public boolean isBothApproved() {
        return status == CancelStatus.APPROVED;
    }
}
