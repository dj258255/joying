package com.joying.rental.domain;

import com.joying.member.domain.Member;
import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;

@Getter
@Entity
@Table(name = "rental_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "rentalHisId", callSuper = false)
public class RentalHistory {

    @Id
    @Column(name = "rental_his_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rentalHisId;

    @Comment("상품ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product rentalProduct;

    @Comment("대여받는 사람ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Comment("상태")
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private RentalStatus status;

    @Comment("보증금")
    @Column(name = "deposit")
    private Long deposit;

    @Comment("이용요금")
    @Column(name = "fee")
    private Integer fee;

    @Comment("대여 시작일시")
    @Column(name = "start_ren")
    private Timestamp startRen;

    @Comment("대여 종료일시")
    @Column(name = "end_ren")
    private Timestamp endRen;

    @Comment("대여 운송장 번호")
    @Column(name = "outbound_tracking_no")
    private String outboundTrackingNo;

    @Comment("반납 운송장 번호")
    @Column(name = "return_tracking_no")
    private String returnTrackingNo;

    @Comment("대여 운송사 코드")
    @Column(name = "outbound_carrier_code")
    private String outboundCarrierCode;

    @Comment("반납 운송사 코드")
    @Column(name = "return_carrier_code")
    private String returnCarrierCode;

    @Comment("거래 방법 (ONLINE: 택배, OFFLINE: 직거래)")
    @Enumerated(EnumType.STRING)
    @Column(name = "rent_method")
    private RentMethod rentMethod;

    @Comment("촬영 영상 상태 (ALIVE: 유지, DELETED: 삭제)")
    @Enumerated(EnumType.STRING)
    @Column(name = "video_status")
    private VideoStatus videoStatus;

    @Comment("연장 횟수")
    @Column(name = "extension_count")
    private Integer extensionCount;

    /**
     * 결제 완료 후 Escrow 상태로 전환
     */
    public void markAsEscrow() {
        this.status = RentalStatus.ESCROW;
    }

    /**
     * 거래 취소
     */
    public void cancel() {
        this.status = RentalStatus.CANCELLED;
    }

    /**
     * 거래 완료 (보증금 반환)
     */
    public void complete() {
        this.status = RentalStatus.DEPOSIT_RETURNED;
    }
}
