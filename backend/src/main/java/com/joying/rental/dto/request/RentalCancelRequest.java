package com.joying.rental.dto.request;

import com.joying.member.domain.Member;
import com.joying.rental.domain.CancelStatus;
import com.joying.rental.domain.RentalHistory;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;
import java.time.LocalDateTime;

/**
 * 대여 취소 요청 엔티티
 */
@Getter
@Entity
@Table(name = "rental_cancel_request")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RentalCancelRequest {

    @Id
    @Column(name = "cancel_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cancelId;

    @Comment("대여 내역 ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", nullable = false)
    private RentalHistory rentalHistory;

    @Comment("취소 요청자 ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private Member requester;

    @Comment("취소 사유")
    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Comment("취소 요청 상태")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CancelStatus status;

    @Comment("보증금 차감 금액")
    @Column(name = "deduction_amount")
    private Integer deductionAmount;

    @Comment("취소 요청 일시")
    @Column(name = "requested_at")
    private Timestamp requestedAt;

    @Comment("취소 처리 일시")
    @Column(name = "processed_at")
    private Timestamp processedAt;

    @Comment("취소 응답 사유")
    @Column(name = "response_reason", length = 500)
    private String responseReason;

    /**
     * 취소 요청 생성
     */
    public static RentalCancelRequest create(
            RentalHistory rentalHistory,
            Member requester,
            String cancelReason) {

        RentalCancelRequest request = new RentalCancelRequest();
        request.rentalHistory = rentalHistory;
        request.requester = requester;
        request.cancelReason = cancelReason;
        request.status = CancelStatus.PENDING;
        request.requestedAt = Timestamp.valueOf(LocalDateTime.now());
        request.deductionAmount = 0;

        return request;
    }

    /**
     * 취소 요청 승인
     */
    public void approve(Integer deductionAmount, String responseReason) {
        if (this.status != CancelStatus.PENDING) {
            throw new IllegalStateException("대기 중인 취소 요청만 승인할 수 있습니다");
        }
        this.status = CancelStatus.APPROVED;
        this.deductionAmount = deductionAmount;
        this.responseReason = responseReason;
        this.processedAt = Timestamp.valueOf(LocalDateTime.now());
    }

    /**
     * 취소 요청 거부
     */
    public void reject(String responseReason) {
        if (this.status != CancelStatus.PENDING) {
            throw new IllegalStateException("대기 중인 취소 요청만 거부할 수 있습니다");
        }
        this.status = CancelStatus.REJECTED;
        this.responseReason = responseReason;
        this.processedAt = Timestamp.valueOf(LocalDateTime.now());
    }
}
