package com.joying.rental.repository;

import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
    List<RentalHistory> findByRentalProduct_ProductId(Long productId);

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
     * - 최신순 정렬 (rentalHisId DESC)
     *
     * @param memberId 회원 ID (빌린 사람)
     * @param pageable 페이지 정보
     * @return 대여 내역 페이지
     */
    @Query("SELECT DISTINCT r FROM RentalHistory r " +
           "LEFT JOIN FETCH r.rentalProduct p " +
           "LEFT JOIN FETCH p.writer w " +
           "LEFT JOIN FETCH r.member m " +
           "WHERE r.member.memberId = :memberId " +
           "ORDER BY r.rentalHisId DESC")
    Page<RentalHistory> findBorrowedHistoryByMember(
            @Param("memberId") Long memberId,
            Pageable pageable
    );

    /**
     * 내가 대여해준 내역 조회 (내가 빌려준 내역)
     * - Fetch Join으로 N+1 문제 해결
     * - Pageable로 성능 최적화
     * - 최신순 정렬 (rentalHisId DESC)
     *
     * @param ownerId 상품 소유자 ID
     * @param pageable 페이지 정보
     * @return 대여 내역 페이지
     */
    @Query("SELECT DISTINCT r FROM RentalHistory r " +
           "LEFT JOIN FETCH r.rentalProduct p " +
           "LEFT JOIN FETCH p.writer w " +
           "LEFT JOIN FETCH r.member m " +
           "WHERE p.writer.memberId = :ownerId " +
           "ORDER BY r.rentalHisId DESC")
    Page<RentalHistory> findLendHistoryByOwner(
            @Param("ownerId") Long ownerId,
            Pageable pageable
    );

    /**
     * CountQuery for Pagination (Spring Data JPA uses this automatically)
     * Fetch Join이 포함된 쿼리의 경우 별도의 count 쿼리 필요
     */
    @Query("SELECT COUNT(DISTINCT r) FROM RentalHistory r " +
           "WHERE r.member.memberId = :memberId")
    long countBorrowedHistoryByMember(@Param("memberId") Long memberId);

    @Query("SELECT COUNT(DISTINCT r) FROM RentalHistory r " +
           "WHERE r.rentalProduct.writer.memberId = :ownerId")
    long countLendHistoryByOwner(@Param("ownerId") Long ownerId);

    /**
     * 날짜 겹침 체크용 - 비관적 락 적용
     * - 동시성 문제 해결: Product 락과 함께 RentalHistory 레코드도 락
     * - SELECT FOR UPDATE로 다른 트랜잭션의 동시 예약 방지
     * - 특정 상품의 활성 예약들을 조회하여 날짜 겹침 검증
     *
     * @param productId 상품 ID
     * @param statuses 활성 상태 리스트 (PENDING, ESCROW 등)
     * @return 활성 예약 리스트 (락 걸림)
     */
    @Query("SELECT r FROM RentalHistory r " +
           "WHERE r.rentalProduct.productId = :productId " +
           "AND r.status IN :statuses " +
           "ORDER BY r.startRen ASC " +
           "FOR UPDATE")
    List<RentalHistory> findActiveRentalsWithLock(
            @Param("productId") Long productId,
            @Param("statuses") List<RentalStatus> statuses
    );
}
