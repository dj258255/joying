package com.joying.rental.repository;

import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RentalHistoryRepository extends JpaRepository<RentalHistory, Long> {

    /**
     * 회원의 거래 내역 조회
     */
    List<RentalHistory> findByMember_MemberId(Long memberId);

    /**
     * 상품의 거래 내역 조회
     */
    List<RentalHistory> findAllByRentalProduct_ProductId(Long productId);

    /**
     * 상태별 거래 내역 조회
     */
    List<RentalHistory> findByStatus(RentalStatus status);

    /**
     * 회원의 특정 상태 거래 내역 조회
     */
    List<RentalHistory> findByMember_MemberIdAndStatus(Long memberId, RentalStatus status);

    /**
     * 멱등성 체크: 같은 사용자가 같은 상품에 대해 활성 예약이 있는지 확인
     * - PENDING: 결제 대기 중
     * - ESCROW: 결제 완료, 에스크로 보관 중
     * 더블클릭으로 인한 중복 예약 방지용
     */
    @Query("SELECT r FROM RentalHistory r " +
           "WHERE r.rentalProduct.productId = :productId " +
           "AND r.member.memberId = :memberId " +
           "AND r.status IN :statuses")
    Optional<RentalHistory> findActiveReservation(
            @Param("productId") Long productId,
            @Param("memberId") Long memberId,
            @Param("statuses") List<RentalStatus> statuses
    );

    /**
     * 나의 대여 내역 조회 (내가 빌린 내역)
     * - Fetch Join으로 N+1 문제 해결
     * - Pageable로 성능 최적화
     * - 정렬은 Pageable을 통해 지정
     *
     * @param memberId 회원 ID (빌린 사람)
     * @param pageable 페이지 정보
     * @return 대여 내역 페이지
     */
    @Query(value = "SELECT r FROM RentalHistory r " +
           "LEFT JOIN FETCH r.rentalProduct p " +
           "LEFT JOIN FETCH p.writer w " +
           "LEFT JOIN FETCH r.member m " +
           "WHERE r.member.memberId = :memberId",
           countQuery = "SELECT COUNT(r) FROM RentalHistory r " +
           "WHERE r.member.memberId = :memberId")
    Page<RentalHistory> findBorrowedHistoryByMember(
            @Param("memberId") Long memberId,
            Pageable pageable
    );

    /**
     * 내가 대여해준 내역 조회 (내가 빌려준 내역)
     * - Fetch Join으로 N+1 문제 해결
     * - Pageable로 성능 최적화
     * - 정렬은 Pageable을 통해 지정
     *
     * @param ownerId 상품 소유자 ID
     * @param pageable 페이지 정보
     * @return 대여 내역 페이지
     */
    @Query(value = "SELECT r FROM RentalHistory r " +
           "LEFT JOIN FETCH r.rentalProduct p " +
           "LEFT JOIN FETCH p.writer w " +
           "LEFT JOIN FETCH r.member m " +
           "WHERE p.writer.memberId = :ownerId",
           countQuery = "SELECT COUNT(r) FROM RentalHistory r " +
           "WHERE r.rentalProduct.writer.memberId = :ownerId")
    Page<RentalHistory> findLendHistoryByOwner(
            @Param("ownerId") Long ownerId,
            Pageable pageable
    );


    /**
     * 날짜 겹침 체크용 - 비관적 락 적용
     * - 동시성 문제 해결: Product 락과 함께 RentalHistory 레코드도 락
     * - PESSIMISTIC_WRITE 락으로 다른 트랜잭션의 동시 예약 방지
     * - 특정 상품의 활성 예약들을 조회하여 날짜 겹침 검증
     *
     * @param productId 상품 ID
     * @param statuses 활성 상태 리스트 (PENDING, ESCROW 등)
     * @return 활성 예약 리스트 (락 걸림)
     */
    @Query("SELECT r FROM RentalHistory r " +
           "WHERE r.rentalProduct.productId = :productId " +
           "AND r.status IN :statuses " +
           "ORDER BY r.startRen ASC")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<RentalHistory> findActiveRentalsWithLock(
            @Param("productId") Long productId,
            @Param("statuses") List<RentalStatus> statuses
    );

    @Query("""
        SELECT rh FROM RentalHistory rh
        JOIN FETCH rh.rentalProduct rp
        JOIN FETCH rp.writer
        JOIN FETCH rh.member
        WHERE rh.rentalHisId = :id
    """)
    Optional<RentalHistory> findWithProductAndMemberById(Long id);
}
