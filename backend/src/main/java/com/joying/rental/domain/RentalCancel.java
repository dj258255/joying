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

    @Comment("취소 거래 완료 일시")
    @Column(name = "created_at", nullable = false)
    private Timestamp createdAt;

}
