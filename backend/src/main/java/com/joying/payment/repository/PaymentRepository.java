package com.joying.payment.repository;

import com.joying.payment.domain.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.awt.print.Pageable;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    // ---- 식별자 조회(토스/가맹점 기준) ----
    Optional<Payment> findByOrderId(String orderId);
    Optional<Payment> findByPaymentKey(String paymentKey);
    boolean existsByOrderId(String orderId);

    // ---- 상태 전이(승인/취소) 시 중복 방지용 잠금 조회(선택) ----
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.orderId = :orderId")
    Optional<Payment> lockByOrderId(@Param("orderId") String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.paymentKey = :paymentKey")
    Optional<Payment> lockByPaymentKey(@Param("paymentKey") String paymentKey);


    Page<Payment> findByMember_MemberId(Long memberId, Pageable pageable);
    Page<Payment> findByRentalHistory_RentalHisId(Long rentalHisId, Pageable pageable);

}
