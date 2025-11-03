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
     * 대여 생성 (예약)
     */
    public static RentalHistory create(
            Product product,
            Member renter,
            Timestamp startRen,
            Timestamp endRen,
            RentMethod rentMethod) {

        RentalHistory rental = new RentalHistory();
        rental.rentalProduct = product;
        rental.member = renter;
        rental.startRen = startRen;
        rental.endRen = endRen;
        rental.rentMethod = rentMethod;

        // 상품 정보에서 가져오기
        rental.fee = product.getRentalFee();
        rental.deposit = Long.valueOf(product.getDeposit());

        // 초기 상태
        rental.status = RentalStatus.PENDING;  // 결제 전 상태
        rental.videoStatus = VideoStatus.ALIVE;
        rental.extensionCount = 0;

        return rental;
    }

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

    /**
     * 발송 처리 (owner가 상품 발송)
     */
    public void ship(String carrierCode, String trackingNo) {
        if (this.status != RentalStatus.ESCROW) {
            throw new IllegalStateException("ESCROW 상태에서만 발송할 수 있습니다");
        }
        this.outboundCarrierCode = carrierCode;
        this.outboundTrackingNo = trackingNo;
        this.status = RentalStatus.SHIPPED;
    }

    /**
     * 수령 확인 (renter가 상품 수령)
     */
    public void confirmReceive() {
        if (this.status != RentalStatus.SHIPPED) {
            throw new IllegalStateException("SHIPPED 상태에서만 수령 확인할 수 있습니다");
        }
        this.status = RentalStatus.RENTING;
    }

    /**
     * 반납 처리 (renter가 상품 반납)
     */
    public void returnItem(String carrierCode, String trackingNo) {
        if (this.status != RentalStatus.RENTING) {
            throw new IllegalStateException("RENTING 상태에서만 반납할 수 있습니다");
        }
        this.returnCarrierCode = carrierCode;
        this.returnTrackingNo = trackingNo;
        this.status = RentalStatus.RETURN_REQUESTED;
    }

    /**
     * 회수 확인 (owner가 상품 회수 확인)
     */
    public void confirmReturn() {
        if (this.status != RentalStatus.RETURN_REQUESTED) {
            throw new IllegalStateException("RETURN_REQUESTED 상태에서만 회수 확인할 수 있습니다");
        }
        this.status = RentalStatus.RETURNED;
    }

    /**
     * 대여 기간 연장
     */
    public void extend(Timestamp newEndRen, Integer additionalFee) {
        if (this.status != RentalStatus.RENTING) {
            throw new IllegalStateException("RENTING 상태에서만 연장할 수 있습니다");
        }
        if (newEndRen.before(this.endRen)) {
            throw new IllegalArgumentException("연장 종료일은 기존 종료일보다 늦어야 합니다");
        }
        this.endRen = newEndRen;
        this.fee += additionalFee;
        this.extensionCount++;
    }
}
