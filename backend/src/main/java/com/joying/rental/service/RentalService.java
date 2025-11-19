package com.joying.rental.service;

import com.joying.escrow.domain.Status;
import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import com.joying.account.domain.Account;
import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.common.config.DevModeProperties;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.escrow.service.EscrowService;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.domain.Payment;
import com.joying.payment.domain.PaymentStatus;
import com.joying.payment.dto.request.PaymentCancelRequest;
import com.joying.payment.repository.PaymentRepository;
import com.joying.payment.service.PaymentService;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;
import com.joying.rental.domain.RentalCancel;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import com.joying.rental.domain.RentalVideo;
import com.joying.rental.domain.VideoType;
import com.joying.ssafy.service.FinanceApiService;
import com.joying.rental.dto.request.ReservationCreateRequest;
import com.joying.rental.dto.request.ShipRequest;
import com.joying.rental.dto.request.VideoUploadRequest;
import com.joying.rental.dto.response.ConfirmReceiveResponse;
import com.joying.rental.dto.response.RentalDetailResponse;
import com.joying.rental.dto.response.ReservationCreateResponse;
import com.joying.rental.dto.response.ShipResponse;
import com.joying.rental.dto.response.VideoListResponse;
import com.joying.rental.dto.response.VideoResponse;
import com.joying.rental.repository.RentalCancelRepository;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.rental.repository.RentalVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Optional;

/**
 * 대여 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RentalService {

    private final RentalHistoryRepository rentalHistoryRepository;
    private final RentalVideoRepository rentalVideoRepository;
    private final ProductRepository productRepository;
    private final MemberRepository memberRepository;
    private final FileRepository fileRepository;
    private final FileUrlResolver fileUrlResolver;
    private final RentalCancelRepository rentalCancelRepository;
    private final EscrowRepository escrowRepository;
    private final EscrowService escrowService;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final FinanceApiService financeApiService;
    private final FinanceApiProperties financeApiProperties;
    private final DevModeProperties devModeProperties;

    /**
     * 대여 생성 (예약)
     * - 비관적 락을 통한 동시성 제어 (다른 사용자 동시 예약 방지)
     * - 멱등성 체크 (같은 사용자 더블클릭 방지)
     *
     * @param productId 상품 ID
     * @param request 예약 정보
     * @param renterId 빌리는 사람 ID
     * @return 예약 생성 결과
     */
    @Transactional
    public ReservationCreateResponse createReservation(
            Long productId,
            ReservationCreateRequest request,
            Long renterId) {

        log.info("[대여 생성] productId={}, renterId={}, startRen={}, endRen={}",
                productId, renterId, request.getStartRen(), request.getEndRen());

        // 멱등성 체크 제거: 날짜가 다르면 같은 상품/사람이어도 여러 거래 생성 가능
        // 날짜 겹침 체크는 아래 findActiveRentalsWithLock에서 처리됨

        // 1. 비관적 락으로 Product 조회 (동시 요청 직렬화)
        Product product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + productId));

        Member renter = memberRepository.findById(renterId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + renterId));

        // 3. 본인 상품 대여 검증 (개발 모드에서는 허용)
        // BORROW 상품의 경우: 상품 주인이 빌리는 사람이므로 검증 로직이 반대
        boolean isProductOwner = product.getWriter().getMemberId().equals(renterId);
        boolean isBorrowProduct = "BORROW".equals(product.getUploadType() != null ? product.getUploadType().name() : null);

        if (!devModeProperties.isAllowSelfRental()) {
            if (isBorrowProduct) {
                // BORROW 상품: 상품 주인이 빌리는 사람이어야 함 (상대방이 빌려줌)
                if (!isProductOwner) {
                    throw new IllegalArgumentException("BORROW 상품은 상품 주인만 빌릴 수 있습니다");
                }
            } else {
                // RENT 상품: 상품 주인이 아닌 사람이 빌려야 함 (기존 로직)
                if (isProductOwner) {
                    throw new IllegalArgumentException("본인의 상품은 빌릴 수 없습니다");
                }
            }
        }

        if (devModeProperties.isAllowSelfRental() && isProductOwner && !isBorrowProduct) {
            log.warn("[개발 모드] 본인 상품 대여 허용: productId={}, memberId={}", productId, renterId);
        }

        // 4. 기본 날짜 검증
        if (request.getEndRen().isBefore(request.getStartRen())) {
            throw new IllegalArgumentException("종료일은 시작일보다 이후여야 합니다");
        }

        // 5. 상품의 대여 가능 기간 검증
        Timestamp requestStart = Timestamp.valueOf(request.getStartRen());
        Timestamp requestEnd = Timestamp.valueOf(request.getEndRen());

        // Timestamp를 Instant로 변환하여 비교
        java.time.Instant requestStartInstant = requestStart.toInstant();
        java.time.Instant requestEndInstant = requestEnd.toInstant();

        if (product.getStartRent() != null && requestStartInstant.isBefore(product.getStartRent())) {
            throw new IllegalArgumentException("대여 시작일이 상품의 대여 가능 시작일보다 이릅니다");
        }

        if (product.getEndRent() != null && requestEndInstant.isAfter(product.getEndRent())) {
            throw new IllegalArgumentException("대여 종료일이 상품의 대여 가능 종료일을 초과합니다");
        }

        // 6. 다른 예약과 겹치는지 확인 (비관적 락으로 보호 - 동시성 제어)
        // SELECT FOR UPDATE로 활성 예약 레코드에 락을 걸어 Race Condition 방지
        List<RentalHistory> activeRentals = rentalHistoryRepository.findActiveRentalsWithLock(
                productId,
                java.util.List.of(
                        com.joying.rental.domain.RentalStatus.PENDING,
                        com.joying.rental.domain.RentalStatus.ESCROW,
                        com.joying.rental.domain.RentalStatus.SHIPPED,
                        com.joying.rental.domain.RentalStatus.RENTING
                )
        );

        boolean hasConflict = activeRentals.stream()
                .anyMatch(r -> {
                    // 날짜 겹침 확인
                    // (요청 시작 < 기존 종료) AND (요청 종료 > 기존 시작)
                    java.time.Instant existingStart = r.getStartRen().toInstant();
                    java.time.Instant existingEnd = r.getEndRen().toInstant();
                    return requestStartInstant.isBefore(existingEnd) && requestEndInstant.isAfter(existingStart);
                });

        if (hasConflict) {
            throw new IllegalArgumentException("해당 기간에 이미 다른 예약이 있습니다");
        }

        // 7. RentalHistory 생성 (요청에서 커스텀 fee/deposit 전달)
        RentalHistory rental = RentalHistory.create(
                product,
                renter,
                requestStart,
                requestEnd,
                request.getRentMethod(),
                request.getFee(),       // null이면 상품 기본값 사용
                request.getDeposit()    // null이면 상품 기본값 사용
        );

        // 8. 저장
        RentalHistory savedRental = rentalHistoryRepository.save(rental);

        log.info("[대여 생성 완료] rentalHisId={}, status={}", savedRental.getRentalHisId(), savedRental.getStatus());

        // 9. 응답 생성
        return ReservationCreateResponse.builder()
                .rentalHisId(savedRental.getRentalHisId())
                .productId(productId)
                .status(savedRental.getStatus().name())
                .fee(savedRental.getFee())
                .deposit(savedRental.getDeposit())
                .totalAmount(savedRental.getFee() + savedRental.getDeposit().intValue())
                .startRen(request.getStartRen())
                .endRen(request.getEndRen())
                .message("예약이 생성되었습니다. 결제를 진행해주세요.")
                .build();
    }

    /**
     * 거래 상세 조회
     *
     * @param rentalHisId 대여 내역 ID
     * @param memberId 요청한 회원 ID
     * @return 거래 상세 정보
     */
    public RentalDetailResponse getRentalDetail(Long rentalHisId, Long memberId) {
        log.info("[거래 상세 조회] rentalHisId={}, memberId={}", rentalHisId, memberId);

        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 권한 검증 (거래 당사자만 조회 가능)
        // productWriter: 상품을 올린 사람 (RENT=대여자, BORROW=빌린 사람)
        // rentalMember: 거래를 생성한 사람 (RENT=빌린 사람, BORROW=대여자)
        Long productWriterId = rental.getRentalProduct().getWriter().getMemberId();
        Long rentalMemberId = rental.getMember().getMemberId();

        // 상품 올린 사람이거나 거래 생성한 사람이면 조회 가능
        if (!memberId.equals(productWriterId) && !memberId.equals(rentalMemberId)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        // TODO: Escrow, Payment, Videos 등 조회 추가
        return RentalDetailResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .product(RentalDetailResponse.ProductInfo.builder()
                        .productId(rental.getRentalProduct().getProductId())
                        .title(rental.getRentalProduct().getTitle())
                        .build())
                .renter(RentalDetailResponse.MemberInfo.builder()
                        .memberId(rental.getMember().getMemberId())
                        .name(rental.getMember().getName())
                        .nickname(rental.getMember().getNickname())
                        .build())
                .owner(RentalDetailResponse.MemberInfo.builder()
                        .memberId(rental.getRentalProduct().getWriter().getMemberId())
                        .name(rental.getRentalProduct().getWriter().getName())
                        .nickname(rental.getRentalProduct().getWriter().getNickname())
                        .build())
                .status(rental.getStatus().name())
                .rentMethod(rental.getRentMethod().name())
                .fee(rental.getFee())
                .deposit(rental.getDeposit())
                .startRen(rental.getStartRen().toLocalDateTime())
                .endRen(rental.getEndRen().toLocalDateTime())
                .extensionCount(rental.getExtensionCount())
                .build();
    }

    /**
     * 발송 처리 (상품 발송)
     *
     * @param rentalHisId 대여 내역 ID
     * @param request 발송 정보
     * @param memberId 요청한 회원 ID
     * @return 발송 응답
     */
    @Transactional
    public ShipResponse shipItem(Long rentalHisId, ShipRequest request, Long memberId) {
        log.info("[발송 처리] rentalHisId={}, memberId={}, carrierCode={}, trackingNo={}",
                rentalHisId, memberId, request.getCarrierCode(), request.getTrackingNo());

        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 권한 검증 (상품 소유자만 발송 가능)
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        if (!memberId.equals(ownerId)) {
            throw new IllegalArgumentException("상품 소유자만 발송할 수 있습니다");
        }

        // 발송 처리
        rental.ship(request.getCarrierCode(), request.getTrackingNo());

        log.info("[발송 완료] rentalHisId={}, status={}", rentalHisId, rental.getStatus());

        return ShipResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .carrierCode(rental.getOutboundCarrierCode())
                .trackingNo(rental.getOutboundTrackingNo())
                .message("발송이 완료되었습니다")
                .build();
    }

    /**
     * 수령 확인 (상품 수령)
     *
     * @param rentalHisId 대여 내역 ID
     * @param memberId 요청한 회원 ID
     * @return 수령 확인 응답
     */
    @Transactional
    public ConfirmReceiveResponse confirmReceive(Long rentalHisId, Long memberId) {
        log.info("[수령 확인] rentalHisId={}, memberId={}", rentalHisId, memberId);

        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 권한 검증 (빌린 사람만 수령 확인 가능)
        Long renterId = rental.getMember().getMemberId();
        if (!memberId.equals(renterId)) {
            throw new IllegalArgumentException("빌린 사람만 수령 확인할 수 있습니다");
        }

        // 수령 확인
        rental.confirmReceive();

        log.info("[수령 확인 완료] rentalHisId={}, status={}", rentalHisId, rental.getStatus());


        return ConfirmReceiveResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .startRen(rental.getStartRen().toLocalDateTime())
                .endRen(rental.getEndRen().toLocalDateTime())
                .message("수령이 확인되었습니다. 대여가 시작되었습니다")
                .build();
    }

    /**
     * 반납 처리 (상품 반납)
     *
     * @param rentalHisId 대여 내역 ID
     * @param request 반납 정보 (택배사 코드, 운송장 번호)
     * @param memberId 요청한 회원 ID
     * @return 반납 응답
     */
    @Transactional
    public ShipResponse returnItem(Long rentalHisId, ShipRequest request, Long memberId) {
        log.info("[반납 처리] rentalHisId={}, memberId={}, carrierCode={}, trackingNo={}",
                rentalHisId, memberId, request.getCarrierCode(), request.getTrackingNo());

        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 권한 검증 (빌린 사람만 반납 가능)
        Long renterId = rental.getMember().getMemberId();
        if (!memberId.equals(renterId)) {
            throw new IllegalArgumentException("빌린 사람만 반납할 수 있습니다");
        }

        // 반납 처리
        rental.returnItem(request.getCarrierCode(), request.getTrackingNo());

        escrowRepository.findByRentalHistory_RentalHisId(rentalHisId)
                .ifPresent(escrow -> {
                    if (escrow.getStatus() != Status.RETURN_STARTED) {
                        try {
                            java.lang.reflect.Field statusField = Escrow.class.getDeclaredField("status");
                            statusField.setAccessible(true);
                            statusField.set(escrow, Status.RETURN_STARTED);
                        } catch (Exception e) {
                            throw new IllegalStateException("Escrow 상태 변경 실패", e);
                        }
                    }
                });

        log.info("[반납 완료] rentalHisId={}, status={}", rentalHisId, rental.getStatus());

        return ShipResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .carrierCode(rental.getReturnCarrierCode())
                .trackingNo(rental.getReturnTrackingNo())
                .message("반납이 완료되었습니다")
                .build();
    }

    /**
     * 회수 확인 (상품 회수) + 자동 정산
     *
     * @param rentalHisId 대여 내역 ID
     * @param memberId 요청한 회원 ID
     * @return 회수 확인 응답
     */
    @Transactional
    public ConfirmReceiveResponse confirmReturn(Long rentalHisId, Long memberId) {
        log.info("[회수 확인] rentalHisId={}, memberId={}", rentalHisId, memberId);

        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 권한 검증 (상품 소유자만 회수 확인 가능)
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        if (!memberId.equals(ownerId)) {
            throw new IllegalArgumentException("상품 소유자만 회수 확인할 수 있습니다");
        }

        // 회수 확인
        rental.confirmReturn();

        log.info("[회수 확인 완료] rentalHisId={}, status={}", rentalHisId, rental.getStatus());

        // 자동 정산 처리
        try {
            Escrow escrow = escrowRepository.findByRentalHistory_RentalHisId(rentalHisId)
                    .orElseThrow(() -> new IllegalStateException("에스크로를 찾을 수 없습니다: rentalHisId=" + rentalHisId));

            log.info("[자동 정산 시작] rentalHisId={}, holdId={}", rentalHisId, escrow.getHoldId());

            escrowService.settleEscrow(escrow.getHoldId());

            log.info("[자동 정산 완료] rentalHisId={}, holdId={}", rentalHisId, escrow.getHoldId());

            return ConfirmReceiveResponse.builder()
                    .rentalHisId(rental.getRentalHisId())
                    .status(rental.getStatus().name())
                    .startRen(rental.getStartRen().toLocalDateTime())
                    .endRen(rental.getEndRen().toLocalDateTime())
                    .message("회수가 확인되었습니다. 자동 정산이 완료되었습니다 (대여료 지급 + 보증금 반환)")
                    .build();
        } catch (Exception e) {
            log.error("[자동 정산 실패] rentalHisId={}", rentalHisId, e);
            throw new IllegalStateException("정산 처리 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 영상 업로드
     *
     * @param rentalHisId 대여 내역 ID
     * @param request 영상 업로드 요청 (fileId, videoType)
     * @param memberId 요청한 회원 ID
     * @return 영상 응답
     */
    @Transactional
    public VideoResponse uploadVideo(Long rentalHisId, VideoUploadRequest request, Long memberId) {
        log.info("[영상 업로드] rentalHisId={}, videoType={}, fileId={}, memberId={}",
                rentalHisId, request.getVideoType(), request.getFileId(), memberId);

        // 1. 거래 내역 조회
        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 2. 파일 조회
        File file = fileRepository.findById(request.getFileId())
                .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다: " + request.getFileId()));

        // 3. 권한 및 상태 검증
        validateVideoUpload(rental, request.getVideoType(), memberId);

        // 4. 중복 업로드 확인 및 처리 (기존 영상이 있으면 삭제 후 새로 생성)
        rentalVideoRepository.findByRentalHistory_RentalHisIdAndVideoType(rentalHisId, request.getVideoType())
                .ifPresent(existingVideo -> {
                    log.info("[영상 교체] 기존 rentalVideoId={} 삭제 후 새로 생성", existingVideo.getRentalVideoId());
                    rentalVideoRepository.delete(existingVideo);
                });

        // 5. 새 RentalVideo 생성 및 저장
        RentalVideo rentalVideo = RentalVideo.builder()
                .file(file)
                .rentalHistory(rental)
                .videoType(request.getVideoType())
                .build();

        RentalVideo saved = rentalVideoRepository.save(rentalVideo);

        log.info("[영상 업로드 완료] rentalVideoId={}", saved.getRentalVideoId());

        // 6. 응답 생성
        return VideoResponse.builder()
                .rentalVideoId(saved.getRentalVideoId())
                .rentalHisId(rentalHisId)
                .videoType(saved.getVideoType())
                .videoTypeDescription(saved.getVideoType().getDescription())
                .fileId(file.getFileId())
                .fileUrl(fileUrlResolver.toPublicUrl(file))
                .uploadedAt(saved.getCreatedAt())
                .build();
    }

    /**
     * 영상 목록 조회
     *
     * @param rentalHisId 대여 내역 ID
     * @param memberId 요청한 회원 ID
     * @return 영상 목록 응답
     */
    public VideoListResponse getVideos(Long rentalHisId, Long memberId) {
        log.info("[영상 목록 조회] rentalHisId={}, memberId={}", rentalHisId, memberId);

        // 1. 거래 내역 조회
        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 2. 권한 검증 (거래 당사자만 조회 가능)
        Long productWriterId = rental.getRentalProduct().getWriter().getMemberId();
        Long rentalMemberId = rental.getMember().getMemberId();

        if (!memberId.equals(productWriterId) && !memberId.equals(rentalMemberId)) {
            throw new IllegalArgumentException("권한이 없습니다");
        }

        // 3. 영상 목록 조회 (N+1 방지)
        List<RentalVideo> rentalVideos = rentalVideoRepository.findByRentalHisIdWithFile(rentalHisId);

        // 4. DTO 변환
        List<VideoResponse> videoResponses = rentalVideos.stream()
                .map(rv -> VideoResponse.builder()
                        .rentalVideoId(rv.getRentalVideoId())
                        .rentalHisId(rentalHisId)
                        .videoType(rv.getVideoType())
                        .videoTypeDescription(rv.getVideoType().getDescription())
                        .fileId(rv.getFile().getFileId())
                        .fileUrl(fileUrlResolver.toPublicUrl(rv.getFile()))
                        .uploadedAt(rv.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // 5. 각 타입별 업로드 여부 확인
        boolean hasOwnerSend = rentalVideos.stream().anyMatch(rv -> rv.getVideoType() == VideoType.OWNER_SEND);
        boolean hasRenterReceive = rentalVideos.stream().anyMatch(rv -> rv.getVideoType() == VideoType.RENTER_RECEIVE);
        boolean hasRenterReturn = rentalVideos.stream().anyMatch(rv -> rv.getVideoType() == VideoType.RENTER_RETURN);
        boolean hasOwnerReceive = rentalVideos.stream().anyMatch(rv -> rv.getVideoType() == VideoType.OWNER_RECEIVE);

        return VideoListResponse.builder()
                .rentalHisId(rentalHisId)
                .videos(videoResponses)
                .totalCount(videoResponses.size())
                .hasOwnerSendVideo(hasOwnerSend)
                .hasRenterReceiveVideo(hasRenterReceive)
                .hasRenterReturnVideo(hasRenterReturn)
                .hasOwnerReceiveVideo(hasOwnerReceive)
                .build();
    }

    /**
     * 영상 업로드 검증
     * - 권한: Owner/Renter 구분
     * - 상태: 현재 RentalStatus에 따라 업로드 가능한 VideoType 제한
     */
    private void validateVideoUpload(RentalHistory rental, VideoType videoType, Long memberId) {
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();
        RentalStatus status = rental.getStatus();

        switch (videoType) {
            case OWNER_SEND:
                // Owner만 가능
                if (!memberId.equals(ownerId)) {
                    throw new IllegalArgumentException("상품 소유자만 발송 영상을 업로드할 수 있습니다");
                }
                // ESCROW 상태에서만 가능
                if (status != RentalStatus.ESCROW) {
                    throw new IllegalStateException("ESCROW 상태에서만 발송 영상을 업로드할 수 있습니다 (현재: " + status.getDescription() + ")");
                }
                break;

            case RENTER_RECEIVE:
                // Renter만 가능
                if (!memberId.equals(renterId)) {
                    throw new IllegalArgumentException("빌린 사람만 수령 영상을 업로드할 수 있습니다");
                }
                // SHIPPED 상태에서만 가능
                if (status != RentalStatus.SHIPPED) {
                    throw new IllegalStateException("SHIPPED 상태에서만 수령 영상을 업로드할 수 있습니다 (현재: " + status.getDescription() + ")");
                }
                break;

            case RENTER_RETURN:
                // Renter만 가능
                if (!memberId.equals(renterId)) {
                    throw new IllegalArgumentException("빌린 사람만 반납 영상을 업로드할 수 있습니다");
                }
                // RENTING 상태에서만 가능
                if (status != RentalStatus.RENTING) {
                    throw new IllegalStateException("RENTING 상태에서만 반납 영상을 업로드할 수 있습니다 (현재: " + status.getDescription() + ")");
                }
                break;

            case OWNER_RECEIVE:
                // Owner만 가능
                if (!memberId.equals(ownerId)) {
                    throw new IllegalArgumentException("상품 소유자만 회수 영상을 업로드할 수 있습니다");
                }
                // RETURN_REQUESTED 상태에서만 가능
                if (status != RentalStatus.RETURN_REQUESTED) {
                    throw new IllegalStateException("RETURN_REQUESTED 상태에서만 회수 영상을 업로드할 수 있습니다 (현재: " + status.getDescription() + ")");
                }
                break;

            default:
                throw new IllegalArgumentException("유효하지 않은 영상 타입입니다");
        }
    }

    /**
     * 대여 기간 연장
     * - RENTING 상태에서만 연장 가능
     * - 추가 대여료 결제 필요
     * - 보안: 빌린 사람만 연장 가능
     *
     * @param rentalHisId 대여 내역 ID
     * @param request 연장 요청 (새 종료일, 추가 대여료)
     * @param memberId 요청한 회원 ID
     * @return 연장 응답 (결제 정보 포함)
     */
    @Transactional
    public com.joying.rental.dto.response.ExtendResponse extendRental(
            Long rentalHisId,
            com.joying.rental.dto.request.ExtendRequest request,
            Long memberId) {

        log.info("[대여 기간 연장] rentalHisId={}, memberId={}, newEndRen={}, additionalFee={}",
                rentalHisId, memberId, request.getNewEndRen(), request.getAdditionalFee());

        // 1. RentalHistory 조회
        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 2. 권한 검증 (빌린 사람만 연장 가능)
        Long renterId = rental.getMember().getMemberId();
        if (!memberId.equals(renterId)) {
            throw new IllegalArgumentException("빌린 사람만 대여 기간을 연장할 수 있습니다");
        }

        // 3. 상태 검증 (RENTING 상태에서만 연장 가능)
        if (rental.getStatus() != com.joying.rental.domain.RentalStatus.RENTING) {
            throw new IllegalStateException("대여 중인 상태에서만 연장할 수 있습니다");
        }

        // 4. 연장일 검증
        if (request.getNewEndRen().isBefore(rental.getEndRen().toLocalDateTime())) {
            throw new IllegalArgumentException("연장 종료일은 현재 종료일보다 이후여야 합니다");
        }

        // 5. 기존 종료일 저장 (응답용)
        java.time.LocalDateTime originalEndRen = rental.getEndRen().toLocalDateTime();
        Integer originalFee = rental.getFee();

        // 6. 연장 결제용 Payment 생성 (PaymentType.EXTENSION)
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + memberId));

        String orderId = "JOYING_EXTENSION_" + rentalHisId + "_" + System.currentTimeMillis();
        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp newEndTimestamp = java.sql.Timestamp.valueOf(request.getNewEndRen());

        Payment extensionPayment = Payment.create(
                rental,
                rental.getRentalProduct(),
                member,
                com.joying.payment.domain.PaymentType.EXTENSION
        );
        // 연장 정보를 Payment에 저장 (결제 승인 시 사용)
        extensionPayment.markReadyForExtension(orderId, request.getAdditionalFee(), now, newEndTimestamp);

        Payment savedPayment = paymentRepository.save(extensionPayment);
        log.info("[연장 결제 생성] rentalHisId={}, orderId={}, amount={}, newEndDate={}",
                rentalHisId, orderId, request.getAdditionalFee(), request.getNewEndRen());

        // 7. 실제 연장은 결제 승인 후 PaymentService.confirmPayment()에서 처리됨
        log.info("[연장 결제 대기 중] rentalHisId={}, orderId={} - 결제 완료 후 연장이 적용됩니다", rentalHisId, orderId);

        // 8. 응답 생성
        return com.joying.rental.dto.response.ExtendResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .originalEndRen(originalEndRen)
                .newEndRen(request.getNewEndRen()) // 요청한 새 종료일
                .originalFee(originalFee)
                .additionalFee(request.getAdditionalFee())
                .totalFee(originalFee + request.getAdditionalFee()) // 예상 총 대여료
                .extensionCount(rental.getExtensionCount()) // 아직 증가 안 함
                .orderId(savedPayment.getOrderId()) // 결제용 orderId 반환
                .message("대여 기간 연장 요청이 완료되었습니다. 추가 대여료(" + request.getAdditionalFee() + "원)를 결제해주세요. 결제 완료 후 연장이 적용됩니다.")
                .build();
    }

    /**
     * 거래 취소 요청 생성
     * - 양측 합의 기반 취소
     * - 보증금 분배 비율 제안
     * - 7일 만료 기한
     *
     * @param rentalHisId 대여 내역 ID
     * @param request 취소 요청 (사유, 보증금 분배)
     * @param memberId 요청한 회원 ID (제안자)
     * @return 취소 응답
     */
    @Transactional
    public com.joying.rental.dto.response.CancelResponse createCancelRequest(
            Long rentalHisId,
            com.joying.rental.dto.request.CancelCreateRequest request,
            Long memberId) {

        log.info("[거래 취소 요청] rentalHisId={}, memberId={}, reason={}",
                rentalHisId, memberId, request.getReason());

        // 1. RentalHistory 조회
        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 2. 권한 검증 (거래 당사자만 취소 요청 가능)
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();
        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
            throw new IllegalArgumentException("거래 당사자만 취소 요청할 수 있습니다");
        }

        // 3. 보증금 분배 검증
        if (request.getDepositOwnerAmt() + request.getDepositRenterAmt() != rental.getDeposit().intValue()) {
            throw new IllegalArgumentException("보증금 분배 합계가 보증금과 일치하지 않습니다");
        }

        // 4. 중복 요청 방지 (이미 대기 중인 취소 요청이 있는지 확인)
        rentalCancelRepository.findByRentalHisIdAndStatus(
                rentalHisId,
                com.joying.rental.domain.CancelStatus.PENDING
        ).ifPresent(existingCancel -> {
            throw new IllegalStateException("이미 대기 중인 취소 요청이 있습니다");
        });

        // 5. Member 조회 (제안자)
        Member proposer = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + memberId));

        // 6. RentalCancel 생성
        RentalCancel cancel = RentalCancel.create(
                rental,
                proposer,
                request.getReason(),
                request.getDepositOwnerAmt(),
                request.getDepositRenterAmt()
        );

        // 7. 저장
        RentalCancel savedCancel = rentalCancelRepository.save(cancel);

        log.info("[거래 취소 요청 완료] cancelId={}, status={}", savedCancel.getCancelId(), savedCancel.getStatus());

        return convertToCancelResponse(savedCancel);
    }

    /**
     * 취소 요청 조회
     *
     * @param rentalHisId 대여 내역 ID
     * @param memberId 요청한 회원 ID
     * @return 취소 응답
     */
    public com.joying.rental.dto.response.CancelResponse getCancelRequest(Long rentalHisId, Long memberId) {
        log.info("[취소 요청 조회] rentalHisId={}, memberId={}", rentalHisId, memberId);

        // 1. RentalHistory 조회
        RentalHistory rental = rentalHistoryRepository.findById(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다: " + rentalHisId));

        // 2. 권한 검증
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();
        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
            throw new IllegalArgumentException("거래 당사자만 조회할 수 있습니다");
        }

        // 3. 최신 취소 요청 조회
        RentalCancel cancel = rentalCancelRepository.findLatestByRentalHisId(rentalHisId)
                .orElseThrow(() -> new IllegalArgumentException("취소 요청이 없습니다"));

        return convertToCancelResponse(cancel);
    }

    /**
     * 취소 승인
     *
     * @param cancelId 취소 요청 ID
     * @param memberId 요청한 회원 ID
     * @return 취소 응답
     */
    @Transactional
    public com.joying.rental.dto.response.CancelResponse approveCancel(Long cancelId, Long memberId) {
        log.info("[취소 승인] cancelId={}, memberId={}", cancelId, memberId);

        // 1. RentalCancel 조회
        RentalCancel cancel = rentalCancelRepository.findById(cancelId)
                .orElseThrow(() -> new IllegalArgumentException("취소 요청을 찾을 수 없습니다: " + cancelId));

        // 2. 권한 검증 (IDOR 방지 - 거래 당사자만 승인 가능)
        RentalHistory rental = cancel.getRentalHistory();
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();

        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
            throw new IllegalArgumentException("거래 당사자만 취소 요청을 승인할 수 있습니다");
        }

        // 3. Member 조회
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + memberId));

        // 4. 승인 처리
        cancel.approve(member);

        // 5. 양측 모두 승인 시 거래 취소 처리
        if (cancel.isBothApproved()) {
            Long rentalHisId = cancel.getRentalHistory().getRentalHisId();

            // 5-1. RentalHistory 취소
            cancel.getRentalHistory().cancel();

            // 5-2. Escrow 조회 (결제 완료된 경우에만 환불 처리)
            Escrow escrow = escrowRepository.findByRentalHistory_RentalHisId(rentalHisId).orElse(null);

            // 결제가 완료되지 않은 경우 (에스크로가 없는 경우) 단순 취소만 처리
            if (escrow == null) {
                log.info("[결제 전 취소] rentalHisId={}, 에스크로 없음 - 환불 처리 스킵", rentalHisId);
                return com.joying.rental.dto.response.CancelResponse.builder()
                        .cancelId(cancel.getCancelId())
                        .rentalHisId(rentalHisId)
                        .status(cancel.getStatus().name())
                        .reason(cancel.getReason())
                        .depositOwnerAmt(cancel.getDepositOwnerAmt())
                        .depositRenterAmt(cancel.getDepositRenterAmt())
                        .build();
            }

            // 5-3. 계좌 정보 조회
            Member lender = rental.getRentalProduct().getWriter();
            Member renter = rental.getMember();

            Account lenderAccount = lender.getAccounts().stream()
                    .filter(Account::isUsable)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("대여자의 사용 가능한 계좌가 없습니다: memberId=" + lender.getMemberId()));

            Account renterAccount = renter.getAccounts().stream()
                    .filter(Account::isUsable)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("차용자의 사용 가능한 계좌가 없습니다: memberId=" + renter.getMemberId()));

            // 5-4. Joying 중개 계좌 정보
            String escrowAccountNo = financeApiProperties.getEscrow().getAccountNo();
            String escrowUserKey = financeApiProperties.getEscrow().getUserKey();

            // 5-5. SSAFY 금융망으로 환불 분배
            try {
                // 대여료 + 차용자 보증금 몫 → 차용자에게 환불
                long renterRefundAmt = escrow.getRentalFee() + cancel.getDepositRenterAmt();
                String renterTxNo = financeApiService.transferMoney(
                        escrowAccountNo,
                        renterAccount.getAccountNo(),
                        renterRefundAmt,
                        "Joying 취소 환불 (대여료+보증금)",
                        escrowUserKey
                );
                log.info("[차용자 환불 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                        rentalHisId, renterTxNo, renterRefundAmt, renterAccount.getAccountNo());

                // 대여자 보증금 몫 → 대여자에게 지급
                if (cancel.getDepositOwnerAmt() > 0) {
                    String lenderTxNo = financeApiService.transferMoney(
                            escrowAccountNo,
                            lenderAccount.getAccountNo(),
                            cancel.getDepositOwnerAmt().longValue(),
                            "Joying 취소 보증금 분배",
                            escrowUserKey
                    );
                    log.info("[대여자 보증금 분배 완료] rentalHisId={}, txNo={}, amount={}, to={}",
                            rentalHisId, lenderTxNo, cancel.getDepositOwnerAmt(), lenderAccount.getAccountNo());
                }
            } catch (Exception e) {
                log.error("[SSAFY 금융망 환불 실패] rentalHisId={}", rentalHisId, e);
                throw new IllegalStateException("환불 처리 중 오류가 발생했습니다", e);
            }

            // 5-6. Escrow 상태 변경
            escrow.refund();
            log.info("[Escrow 환불 처리] rentalHisId={}, holdId={}", rentalHisId, escrow.getHoldId());

            // 5-7. Payment 상태 변경 (DONE → CANCELLED)
            List<Payment> payments = paymentRepository.findByRentalHistory_RentalHisId(rentalHisId);
            for (Payment payment : payments) {
                if (payment.getStatus() == PaymentStatus.DONE) {
                    payment.cancel();
                    log.info("[Payment 상태 변경] rentalHisId={}, orderId={}, status=CANCELLED",
                            rentalHisId, payment.getOrderId());
                }
            }

            log.info("[취소 양측 승인 완료] cancelId={}, rentalHisId={}", cancelId, rentalHisId);
        }

        log.info("[취소 승인 완료] cancelId={}, status={}", cancelId, cancel.getStatus());

        return convertToCancelResponse(cancel);
    }

    /**
     * 취소 거부
     *
     * @param cancelId 취소 요청 ID
     * @param request 거부 요청 (거부 사유)
     * @param memberId 요청한 회원 ID
     * @return 취소 응답
     */
    @Transactional
    public com.joying.rental.dto.response.CancelResponse rejectCancel(
            Long cancelId,
            com.joying.rental.dto.request.CancelRejectRequest request,
            Long memberId) {

        log.info("[취소 거부] cancelId={}, memberId={}, rejectReason={}",
                cancelId, memberId, request.getRejectReason());

        // 1. RentalCancel 조회
        RentalCancel cancel = rentalCancelRepository.findById(cancelId)
                .orElseThrow(() -> new IllegalArgumentException("취소 요청을 찾을 수 없습니다: " + cancelId));

        // 2. 권한 검증 (IDOR 방지 - 거래 당사자만 거부 가능)
        RentalHistory rental = cancel.getRentalHistory();
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();

        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
            throw new IllegalArgumentException("거래 당사자만 취소 요청을 거부할 수 있습니다");
        }

        // 3. Member 조회
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + memberId));

        // 4. 거부 처리
        cancel.reject(member, request.getRejectReason());

        log.info("[취소 거부 완료] cancelId={}, status={}", cancelId, cancel.getStatus());

        return convertToCancelResponse(cancel);
    }

    /**
     * RentalCancel -> CancelResponse 변환
     */
    private com.joying.rental.dto.response.CancelResponse convertToCancelResponse(RentalCancel cancel) {
        return com.joying.rental.dto.response.CancelResponse.builder()
                .cancelId(cancel.getCancelId())
                .rentalHisId(cancel.getRentalHistory().getRentalHisId())
                .proposerId(cancel.getProposer().getMemberId())
                .proposerName(cancel.getProposer().getName())
                .reason(cancel.getReason())
                .depositOwnerAmt(cancel.getDepositOwnerAmt())
                .depositRenterAmt(cancel.getDepositRenterAmt())
                .status(cancel.getStatus().name())
                .ownerDecision(cancel.getOwnerDecision().name())
                .renterDecision(cancel.getRenterDecision().name())
                .ownerDecidedAt(cancel.getOwnerDecidedAt() != null ?
                        cancel.getOwnerDecidedAt().toLocalDateTime() : null)
                .renterDecidedAt(cancel.getRenterDecidedAt() != null ?
                        cancel.getRenterDecidedAt().toLocalDateTime() : null)
                .expiresAt(cancel.getExpiresAt().toLocalDateTime())
                .createdAt(cancel.getCreatedAt().toLocalDateTime())
                .message(buildCancelMessage(cancel))
                .build();
    }

    /**
     * 취소 상태에 따른 메시지 생성
     */
    private String buildCancelMessage(RentalCancel cancel) {
        switch (cancel.getStatus()) {
            case PENDING:
                return "취소 요청이 대기 중입니다. 상대방의 승인을 기다리고 있습니다.";
            case APPROVED:
                return "취소가 승인되었습니다. 보증금 환불이 처리됩니다.";
            case REJECTED:
                return "취소가 거부되었습니다. 거래가 계속 진행됩니다.";
            default:
                return "취소 요청 상태: " + cancel.getStatus().name();
        }
    }

    /**
     * 나의 대여 내역 조회 (내가 빌린 내역)
     * - 읽기 전용 트랜잭션으로 성능 최적화
     * - Fetch Join으로 N+1 문제 해결
     * - Pagination으로 대용량 데이터 처리
     * - 정렬: rentalHisId 내림차순 (최신순)
     *
     * @param memberId 요청한 회원 ID
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지 크기
     * @return 대여 내역 페이지
     */
    public org.springframework.data.domain.Page<com.joying.rental.dto.response.RentalHistoryListResponse> getBorrowedHistory(
            Long memberId,
            int page,
            int size) {

        log.info("[나의 대여 내역 조회] memberId={}, page={}, size={}",
                memberId, page, size);

        // 정렬을 rentalHisId DESC로 고정
        org.springframework.data.domain.Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "rentalHisId")
        );

        // Repository에서 Fetch Join으로 한번에 조회 (N+1 방지)
        org.springframework.data.domain.Page<RentalHistory> rentalPage =
                rentalHistoryRepository.findBorrowedHistoryByMember(memberId, pageable);

        // Entity -> DTO 변환
        return rentalPage.map(r -> convertToListResponse(r, memberId));
    }

    /**
     * 내가 대여해준 내역 조회 (내가 빌려준 내역)
     * - 읽기 전용 트랜잭션으로 성능 최적화
     * - Fetch Join으로 N+1 문제 해결
     * - Pagination으로 대용량 데이터 처리
     * - 정렬: rentalHisId 내림차순 (최신순)
     *
     * @param ownerId 요청한 회원 ID (상품 소유자)
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지 크기
     * @return 대여 내역 페이지
     */
    public org.springframework.data.domain.Page<com.joying.rental.dto.response.RentalHistoryListResponse> getLendHistory(
            Long ownerId,
            int page,
            int size) {

        log.info("[내가 대여해준 내역 조회] ownerId={}, page={}, size={}",
                ownerId, page, size);

        // 정렬을 rentalHisId DESC로 고정
        org.springframework.data.domain.Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "rentalHisId")
        );

        // Repository에서 Fetch Join으로 한번에 조회 (N+1 방지)
        org.springframework.data.domain.Page<RentalHistory> rentalPage =
                rentalHistoryRepository.findLendHistoryByOwner(ownerId, pageable);

        // Entity -> DTO 변환

        return rentalPage.map(r -> convertToListResponse(r, ownerId));
    }

    /**
     * RentalHistory Entity -> RentalHistoryListResponse DTO 변환
     * - 효율적인 데이터 전송을 위한 경량 DTO 사용
     *
     * @param rental RentalHistory 엔티티
     * @return RentalHistoryListResponse DTO
     */
    private com.joying.rental.dto.response.RentalHistoryListResponse convertToListResponse(RentalHistory rental, Long currentMemberId) {
        Product product = rental.getRentalProduct();
        Member owner = product.getWriter();
        Member renter = rental.getMember();

        Member counterpartyEntity;
        if (currentMemberId != null && currentMemberId.equals(owner.getMemberId())) {
            // 현재 사용자가 상품 소유자(= 내가 '내가 빌려준 내역'을 보는 경우)
            // → 상대방은 빌려간 사람 (renter)
            counterpartyEntity = renter;
        } else {
            // 현재 사용자가 대여자이거나(= 내가 빌린 내역을 보는 경우) 또는 기타
            // → 상대방은 상품 소유자(owner)
            counterpartyEntity = owner;
        }

        String profileImagePath = null;
        if (counterpartyEntity.getProfileImage() != null) {
            profileImagePath = counterpartyEntity.getProfileImage().getDirectory() + "/" +
                    counterpartyEntity.getProfileImage().getFileName();
        }

        return com.joying.rental.dto.response.RentalHistoryListResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .rentMethod(rental.getRentMethod().name())
                .fee(rental.getFee())
                .deposit(rental.getDeposit())
                .startRen(rental.getStartRen() != null ? rental.getStartRen().toLocalDateTime() : null)
                .endRen(rental.getEndRen() != null ? rental.getEndRen().toLocalDateTime() : null)
                .extensionCount(rental.getExtensionCount())
                .product(com.joying.rental.dto.response.RentalHistoryListResponse.ProductSummary.builder()
                        .productId(product.getProductId())
                        .title(product.getTitle())
                        .thumbnail(null)
                        .category(product.getCategory() != null ? product.getCategory().getCategoryName() : null)
                        .build())
                .counterparty(com.joying.rental.dto.response.RentalHistoryListResponse.MemberSummary.builder()
                        .memberId(counterpartyEntity.getMemberId())
                        .name(counterpartyEntity.getName())
                        .nickname(counterpartyEntity.getNickname())
                        .profileImage(profileImagePath)
                        .rating(counterpartyEntity.getRating())
                        .build())
                .build();
    }
}
