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
}
