package com.joying.payment.domain;

import com.joying.member.domain.Member;
import com.joying.product.domain.Product;
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
@Table(name="payment")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "paymentId", callSuper=false)
public class Payment {
    @Id
    @Column(name="payment_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @Comment("거래내역ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", nullable = false)
    private RentalHistory rentalHistory;

    @Comment("렌탈ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="rental_id", nullable = false)
    private Product rentalProduct;

    @Comment("대여받는 사람ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable=false)
    private Member member;

    @Comment("결제 날짜")
    @Column(name = "deposit_at")
    private Timestamp depositAt;

    @Comment("요금")
    @Column(name = "fee")
    private Integer fee;

    @Comment("결제 종류 (INITIAL: 최초 결제, EXTENSION: 연장 결제)")
    @Enumerated(EnumType.STRING)
    @Column(name="payment_type")
    private PaymentType paymentType;





}
