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

    /**
     * 이 대여 건에서 살아 있는 결제를 잠그고 가져온다.
     *
     * <p>잠금 없이 읽으면 최신 상태가 안 보인다. MySQL 의 기본 격리 수준에서 평범한
     * 조회는 트랜잭션이 처음 읽은 시점의 모습을 계속 본다. 앞선 요청이 결제를 만들고
     * 커밋해도, 그보다 먼저 무언가를 읽은 트랜잭션에게는 여전히 없는 것으로 보인다.
     *
     * <p>잠금 읽기는 그 규칙에서 빠져 항상 지금 커밋된 것을 본다. 그래서 대여 건을
     * 잠근 것만으로는 부족하고 이 조회도 잠금으로 해야 한다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.rentalHistory.rentalHisId = :rentalHisId "
            + "AND p.status <> com.joying.payment.domain.PaymentStatus.CANCELED")
    List<Payment> findActiveByRentalWithLock(@Param("rentalHisId") Long rentalHisId);

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
