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
@Table(
        name = "payment",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_payment_order", columnNames = "order_id"),
                @UniqueConstraint(name = "uk_payment_key",   columnNames = "payment_key")
        },
        indexes = {
                @Index(name = "idx_payment_member",      columnList = "member_id"),
                @Index(name = "idx_payment_rental_his",  columnList = "rental_his_id"),
                @Index(name = "idx_payment_status",      columnList = "status"),
                @Index(name = "idx_payment_approved_at", columnList = "approved_at")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "paymentId", callSuper=false)
public class Payment {

    /*
     * 살아 있는 결제는 대여 건과 종류마다 하나뿐이다.
     *
     * 이미 있는지를 조회해서 판정하면 동시에 들어온 두 요청이 둘 다 없다고 읽고 둘 다
     * 넣는다. 16건을 동시에 보내면 결제가 10건 생겼다.
     *
     * 그 제약은 조건부 유니크 인덱스로 건다. 취소된 것은 제약 대상에서 빠지므로
     * 재시도 때마다 쌓이는 취소 건은 여럿이어도 된다.
     *
     *   CREATE UNIQUE INDEX uk_payment_active ON payment (rental_his_id, payment_type)
     *     WHERE status <> 'CANCELED';
     *
     * JPA 의 @UniqueConstraint 로는 조건을 붙일 수 없어 마이그레이션에 둔다.
     * (db/migration/V2__payment_active_partial_index.sql)
     *
     * MySQL 을 쓰던 때는 이 기능이 없어 active_key 열을 두고 취소할 때 비우는 방식으로
     * 흉내 냈다. 열도 필요 없고 비울 것도 없어졌다.
     */
    @Id
    @Column(name="payment_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @Comment("거래내역ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", nullable = false)
    private RentalHistory rentalHistory;

    @Comment("상품ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="product_id", nullable = true)
    private Product product;

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
    @Column(name="payment_type", length = 30)
    private PaymentType paymentType;

    @Column(name = "order_id", nullable = false, length = 100)
    @Comment("가맹점 주문번호(멱등키) - 우리가 생성")
    private String orderId;

    @Column(name = "payment_key", length = 200)
    @Comment("토스 결제키(paymentKey) - 승인 후 세팅")
    private String paymentKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Comment("결제 상태(READY/DONE/CANCELED/FAILED)")
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 30)
    @Comment("결제 수단(CARD/TRANSFER/VIRTUAL_ACCOUNT 등)")
    private PaymentMethod method;

    @Column(name = "total_amount", nullable = false)
    @Comment("결제 총액(검증 기준)")
    private Integer totalAmount;

    @Column(name = "requested_at")
    @Comment("결제 생성(요청) 시각")
    private Timestamp requestedAt;

    @Column(name = "approved_at")
    @Comment("결제 승인 시각")
    private Timestamp approvedAt;

    @Column(name = "receipt_url", length = 500)
    @Comment("PG 영수증 URL")
    private String receiptUrl;

    @Column(name = "extension_end_date")
    @Comment("연장 결제 시 새로운 종료일 (EXTENSION 타입에서만 사용)")
    private Timestamp extensionEndDate;

    @Version
    @Column(name = "version")
    @Comment("승인/취소 동시요청 시 경쟁 방지를 위한 버전 관리")
    private Long version;


    public static Payment create(RentalHistory rentalHistory,
                                 Product product,
                                 Member member,
                                 PaymentType paymentType) {
        Payment p = new Payment();
        p.rentalHistory = rentalHistory;
        p.product = product;
        p.member = member;
        p.paymentType = paymentType;
        return p;
    }

    // ====== 상태 메서드 ======
    public void markReady(String orderId, int totalAmount, Timestamp now) {
        this.orderId = orderId;
        this.totalAmount = totalAmount;
        this.status = PaymentStatus.READY;
        this.requestedAt = now;
    }

    /**
     * 연장 결제 준비 (extensionEndDate 포함)
     */
    public void markReadyForExtension(String orderId, int totalAmount, Timestamp now, Timestamp extensionEndDate) {
        this.orderId = orderId;
        this.totalAmount = totalAmount;
        this.status = PaymentStatus.READY;
        this.requestedAt = now;
        this.extensionEndDate = extensionEndDate;
    }

    public void approve(String paymentKey, PaymentMethod method, Timestamp approvedAt, String receiptUrl) {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException("READY 상태에서만 승인할 수 있습니다.");
        }
        this.paymentKey = paymentKey;
        this.method = method;
        this.approvedAt = approvedAt;
        this.receiptUrl = receiptUrl;
        this.status = PaymentStatus.DONE;
        this.depositAt = approvedAt; // 레거시 동기화(선택)
    }

    public void cancel() {
        // READY: 결제 포기 (새 orderId로 재시도 위해 무효화)
        // DONE: 승인된 결제 취소 (환불)
        if (this.status != PaymentStatus.READY && this.status != PaymentStatus.DONE) {
            throw new IllegalStateException("READY 또는 DONE 상태에서만 취소할 수 있습니다. 현재 상태: " + this.status);
        }
        this.status = PaymentStatus.CANCELED;
    }
}
