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
     * <p>잠금을 유지하는 이유는 두 가지다.
     *
     * <p>첫째, 대여 건 잠금과 함께 걸어 두면 이 조회부터 삽입까지가 한 줄로 선다.
     * 대여 건만 잠그고 결제는 평범하게 읽으면, 잠금을 얻는 순서와 읽는 순서가 갈리는
     * 경로가 생길 때 다시 두 건이 될 수 있다.
     *
     * <p>둘째, MySQL 을 쓰던 때는 이것이 없으면 아예 동작하지 않았다. MySQL 의 기본
     * 격리 수준에서 평범한 조회는 트랜잭션이 처음 읽은 시점의 모습을 계속 본다. 결제
     * 생성은 회원과 상품을 먼저 읽으므로 대여 건을 잠글 때는 이미 시점이 잡혀 있었고,
     * 앞선 요청이 커밋한 결제가 보이지 않았다. 16건 중 9건이 실패했다.
     *
     * <p>PostgreSQL 의 기본 격리 수준에서는 평범한 조회도 매번 지금 커밋된 것을 본다.
     * 그 문제 자체가 생기지 않는다. 그래도 첫째 이유가 남아 잠금은 유지한다.
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
