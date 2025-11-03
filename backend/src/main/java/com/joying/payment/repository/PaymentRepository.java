package com.joying.payment.repository;

import com.joying.payment.domain.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    // ---- 식별자 조회(토스/가맹점 기준) ----
    Optional<Payment> findByOrderId(String orderId);
    Optional<Payment> findByPaymentKey(String paymentKey);
    boolean existsByOrderId(String orderId);

    // ---- 대여 내역 기준 조회 ----
    List<Payment> findByRentalHistory_RentalHisId(Long rentalHisId);

    // ---- 상태 전이(승인/취소) 시 중복 방지용 잠금 조회(선택) ----
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.orderId = :orderId")
    Optional<Payment> lockByOrderId(@Param("orderId") String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.paymentKey = :paymentKey")
    Optional<Payment> lockByPaymentKey(@Param("paymentKey") String paymentKey);

    // ---- 페이징 조회 ----
    Page<Payment> findAllByMember_MemberId(Long memberId, Pageable pageable);
    Page<Payment> findAllByRentalHistory_RentalHisId(Long rentalHisId, Pageable pageable);

}
