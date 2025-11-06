package com.joying.rental.service;

import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;
import com.joying.rental.domain.RentalHistory;
import com.joying.rental.domain.RentalStatus;
import com.joying.rental.domain.RentalVideo;
import com.joying.rental.domain.VideoType;
import com.joying.rental.dto.request.ReservationCreateRequest;
import com.joying.rental.dto.request.ShipRequest;
import com.joying.rental.dto.request.VideoUploadRequest;
import com.joying.rental.dto.response.ConfirmReceiveResponse;
import com.joying.rental.dto.response.RentalDetailResponse;
import com.joying.rental.dto.response.ReservationCreateResponse;
import com.joying.rental.dto.response.ShipResponse;
import com.joying.rental.dto.response.VideoListResponse;
import com.joying.rental.dto.response.VideoResponse;
import com.joying.rental.repository.RentalHistoryRepository;
import com.joying.rental.repository.RentalVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

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

    /**
     * 대여 생성 (예약)
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

        // 1. 엔티티 조회
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + productId));

        Member renter = memberRepository.findById(renterId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + renterId));

        // 2. 본인 상품은 빌릴 수 없음
//        if (product.getWriter().getMemberId().equals(renterId)) {
//            throw new IllegalArgumentException("본인의 상품은 빌릴 수 없습니다");
//        }

        // 3. 기본 날짜 검증
        if (request.getEndRen().isBefore(request.getStartRen())) {
            throw new IllegalArgumentException("종료일은 시작일보다 이후여야 합니다");
        }

        // 4. 상품의 대여 가능 기간 검증
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

        // 5. 다른 예약과 겹치는지 확인
        boolean hasConflict = rentalHistoryRepository
                .findByRentalProduct_ProductId(productId)
                .stream()
                .filter(r -> r.getStatus() == com.joying.rental.domain.RentalStatus.ESCROW ||
                             r.getStatus() == com.joying.rental.domain.RentalStatus.PENDING)
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

        // 6. RentalHistory 생성
        RentalHistory rental = RentalHistory.create(
                product,
                renter,
                requestStart,
                requestEnd,
                request.getRentMethod()
        );

        // 7. 저장
        RentalHistory savedRental = rentalHistoryRepository.save(rental);

        log.info("[대여 생성 완료] rentalHisId={}, status={}", savedRental.getRentalHisId(), savedRental.getStatus());

        // 8. 응답 생성
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

        // 권한 검증 (빌린 사람 또는 대여자만 조회 가능)
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();

        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
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
                        .build())
                .owner(RentalDetailResponse.MemberInfo.builder()
                        .memberId(rental.getRentalProduct().getWriter().getMemberId())
                        .name(rental.getRentalProduct().getWriter().getName())
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
     * 회수 확인 (상품 회수)
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

        return ConfirmReceiveResponse.builder()
                .rentalHisId(rental.getRentalHisId())
                .status(rental.getStatus().name())
                .startRen(rental.getStartRen().toLocalDateTime())
                .endRen(rental.getEndRen().toLocalDateTime())
                .message("회수가 확인되었습니다. 정산을 진행해주세요")
                .build();
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

        // 4. 중복 업로드 확인
        if (rentalVideoRepository.existsByRentalHistory_RentalHisIdAndVideoType(rentalHisId, request.getVideoType())) {
            throw new IllegalStateException("이미 해당 타입의 영상이 업로드되어 있습니다");
        }

        // 5. RentalVideo 생성 및 저장
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

        // 2. 권한 검증 (Owner 또는 Renter만 조회 가능)
        Long ownerId = rental.getRentalProduct().getWriter().getMemberId();
        Long renterId = rental.getMember().getMemberId();

        if (!memberId.equals(ownerId) && !memberId.equals(renterId)) {
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
}
