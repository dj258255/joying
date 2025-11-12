package com.joying.rental.controller;

import com.joying.common.response.ApiResponse;
import com.joying.rental.dto.request.CancelCreateRequest;
import com.joying.rental.dto.request.CancelRejectRequest;
import com.joying.rental.dto.request.ExtendRequest;
import com.joying.rental.dto.request.ReservationCreateRequest;
import com.joying.rental.dto.request.ShipRequest;
import com.joying.rental.dto.response.CancelResponse;
import com.joying.rental.dto.request.VideoUploadRequest;
import com.joying.rental.dto.response.ConfirmReceiveResponse;
import com.joying.rental.dto.response.ExtendResponse;
import com.joying.rental.dto.response.RentalDetailResponse;
import com.joying.rental.dto.response.RentalHistoryListResponse;
import com.joying.rental.dto.response.ReservationCreateResponse;
import com.joying.rental.dto.response.ShipResponse;
import com.joying.rental.dto.response.VideoListResponse;
import com.joying.rental.dto.response.VideoResponse;
import com.joying.rental.service.RentalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대여 API 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("api/v1/rentals")
@RequiredArgsConstructor
public class RentalController {

    private final RentalService rentalService;

    /**
     * 대여 생성 (예약)
     *
     * POST /rentals/{productId}/reservations
     */
    @PostMapping("/{productId}/reservations")
    public ResponseEntity<ApiResponse.SuccessBody<ReservationCreateResponse>> createReservation(
            @PathVariable Long productId,
            @Valid @RequestBody ReservationCreateRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());

        // renterId가 요청에 포함되어 있으면 사용, 없으면 현재 사용자를 대여자로 설정
        Long renterId = request.getRenterId();

        log.info("[POST /rentals/{}/reservations] 대여 생성 요청: memberId={}, renterId={}",
                productId, memberId, renterId);

        ReservationCreateResponse response = rentalService.createReservation(
                productId,
                request,
                renterId
        );

        return ApiResponse.created(response);
    }

    /**
     * 거래 상세 조회
     *
     * GET /rental-histories/{rentalHisId}
     */
    @GetMapping("/rental-histories/{rentalHisId}")
    public ResponseEntity<ApiResponse.SuccessBody<RentalDetailResponse>> getRentalDetail(
            @PathVariable Long rentalHisId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rental-histories/{}] 거래 상세 조회: memberId={}",
                rentalHisId, memberId);

        RentalDetailResponse response = rentalService.getRentalDetail(
                rentalHisId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 발송 처리
     *
     * PATCH /rental-histories/{rentalHisId}/ship
     */
    @PatchMapping("/rental-histories/{rentalHisId}/ship")
    public ResponseEntity<ApiResponse.SuccessBody<ShipResponse>> shipItem(
            @PathVariable Long rentalHisId,
            @Valid @RequestBody ShipRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-histories/{}/ship] 발송 처리: memberId={}",
                rentalHisId, memberId);

        ShipResponse response = rentalService.shipItem(
                rentalHisId,
                request,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 수령 확인
     *
     * PATCH /rental-histories/{rentalHisId}/confirm-receive
     */
    @PatchMapping("/rental-histories/{rentalHisId}/confirm-receive")
    public ResponseEntity<ApiResponse.SuccessBody<ConfirmReceiveResponse>> confirmReceive(
            @PathVariable Long rentalHisId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-histories/{}/confirm-receive] 수령 확인: memberId={}",
                rentalHisId, memberId);

        ConfirmReceiveResponse response = rentalService.confirmReceive(
                rentalHisId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 반납 처리
     * PATCH /rental-histories/{rentalHisId}/return
     */
    @PatchMapping("/rental-histories/{rentalHisId}/return")
    public ResponseEntity<ApiResponse.SuccessBody<ShipResponse>> returnItem(
            @PathVariable Long rentalHisId,
            @Valid @RequestBody ShipRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-histories/{}/return] 반납 처리: memberId={}",
                rentalHisId, memberId);

        ShipResponse response = rentalService.returnItem(
                rentalHisId,
                request,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 회수 확인
     *
     * PATCH /rental-histories/{rentalHisId}/confirm-return
     */
    @PatchMapping("/rental-histories/{rentalHisId}/confirm-return")
    public ResponseEntity<ApiResponse.SuccessBody<ConfirmReceiveResponse>> confirmReturn(
            @PathVariable Long rentalHisId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-histories/{}/confirm-return] 회수 확인: memberId={}",
                rentalHisId, memberId);

        ConfirmReceiveResponse response = rentalService.confirmReturn(
                rentalHisId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 영상 업로드
     *
     * POST /rental-histories/{rentalHisId}/video
     */
    @PostMapping("/rental-histories/{rentalHisId}/video")
    public ResponseEntity<ApiResponse.SuccessBody<VideoResponse>> uploadVideo(
            @PathVariable Long rentalHisId,
            @Valid @RequestBody VideoUploadRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[POST /rental-histories/{}/video] 영상 업로드: memberId={}, videoType={}",
                rentalHisId, memberId, request.getVideoType());

        VideoResponse response = rentalService.uploadVideo(
                rentalHisId,
                request,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 영상 조회
     *
     * GET /rental-histories/{rentalHisId}/video
     */
    @GetMapping("/rental-histories/{rentalHisId}/video")
    public ResponseEntity<ApiResponse.SuccessBody<VideoListResponse>> getVideos(
            @PathVariable Long rentalHisId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rental-histories/{}/video] 영상 조회: memberId={}",
                rentalHisId, memberId);

        VideoListResponse response = rentalService.getVideos(
                rentalHisId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 대여 기간 연장
     *
     * PATCH /rental-histories/{rentalHisId}/extend
     *
     * 기능:
     * - RENTING 상태에서만 연장 가능
     * - 추가 대여료 결제 필요
     *
     * 보안:
     * - JWT 인증 필수
     * - 빌린 사람만 연장 가능
     */
    @PatchMapping("/rental-histories/{rentalHisId}/extend")
    public ResponseEntity<ApiResponse.SuccessBody<ExtendResponse>> extendRental(
            @PathVariable Long rentalHisId,
            @Valid @RequestBody ExtendRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-histories/{}/extend] 대여 기간 연장: memberId={}, newEndRen={}",
                rentalHisId, memberId, request.getNewEndRen());

        ExtendResponse response = rentalService.extendRental(
                rentalHisId,
                request,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 거래 취소 요청
     *
     * POST /rental-histories/{rentalHisId}/cancel
     *
     * 기능:
     * - 양측 합의 기반 취소
     * - 보증금 분배 비율 제안
     * - 7일 만료 기한
     *
     * 보안:
     * - JWT 인증 필수
     * - 거래 당사자만 요청 가능
     */
    @PostMapping("/rental-histories/{rentalHisId}/cancel")
    public ResponseEntity<ApiResponse.SuccessBody<CancelResponse>> createCancelRequest(
            @PathVariable Long rentalHisId,
            @Valid @RequestBody CancelCreateRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[POST /rental-histories/{}/cancel] 거래 취소 요청: memberId={}",
                rentalHisId, memberId);

        CancelResponse response = rentalService.createCancelRequest(
                rentalHisId,
                request,
                memberId
        );

        return ApiResponse.created(response);
    }

    /**
     * 취소 요청 조회
     *
     * GET /rental-histories/{rentalHisId}/cancel
     *
     * 보안:
     * - JWT 인증 필수
     * - 거래 당사자만 조회 가능
     */
    @GetMapping("/rental-histories/{rentalHisId}/cancel")
    public ResponseEntity<ApiResponse.SuccessBody<CancelResponse>> getCancelRequest(
            @PathVariable Long rentalHisId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rental-histories/{}/cancel] 취소 요청 조회: memberId={}",
                rentalHisId, memberId);

        CancelResponse response = rentalService.getCancelRequest(
                rentalHisId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 취소 승인
     *
     * PATCH /rental-cancel-requests/{cancelId}/approve
     *
     * 기능:
     * - 양측 모두 승인 시 자동 환불 처리
     *
     * 보안:
     * - JWT 인증 필수
     * - 거래 당사자만 승인 가능
     */
    @PatchMapping("/rental-cancel-requests/{cancelId}/approve")
    public ResponseEntity<ApiResponse.SuccessBody<CancelResponse>> approveCancel(
            @PathVariable Long cancelId,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-cancel-requests/{}/approve] 취소 승인: memberId={}",
                cancelId, memberId);

        CancelResponse response = rentalService.approveCancel(
                cancelId,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 취소 거부
     *
     * PATCH /rental-cancel-requests/{cancelId}/reject
     *
     * 보안:
     * - JWT 인증 필수
     * - 거래 당사자만 거부 가능
     */
    @PatchMapping("/rental-cancel-requests/{cancelId}/reject")
    public ResponseEntity<ApiResponse.SuccessBody<CancelResponse>> rejectCancel(
            @PathVariable Long cancelId,
            @Valid @RequestBody CancelRejectRequest request,
            Authentication authentication) {

        Long memberId = Long.parseLong(authentication.getName());
        log.info("[PATCH /rental-cancel-requests/{}/reject] 취소 거부: memberId={}",
                cancelId, memberId);

        CancelResponse response = rentalService.rejectCancel(
                cancelId,
                request,
                memberId
        );

        return ApiResponse.ok(response);
    }

    /**
     * 나의 대여 내역 조회 (내가 빌린 내역)
     *
     * GET /rentals/borrowed/history
     *
     * 성능 최적화:
     * - Fetch Join으로 N+1 문제 해결
     * - Pagination으로 대용량 데이터 처리
     * - 읽기 전용 트랜잭션으로 성능 향상
     *
     * 정렬:
     * - rentalHisId 내림차순 고정 (최신순)
     *
     * 보안:
     * - JWT 인증 필수
     * - 본인 데이터만 조회 가능
     *
     * @param authentication JWT 인증 정보
     * @param page 페이지 번호 (0부터 시작, default: 0)
     * @param size 페이지 크기 (default: 20)
     * @return 대여 내역 페이지
     */
    @GetMapping("/borrowed/history")
    public ResponseEntity<ApiResponse.SuccessBody<Page<RentalHistoryListResponse>>> getBorrowedHistory(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rentals/borrowed/history] 나의 대여 내역 조회 : memberId={}, page={}, size={}",
                memberId, page, size);

        Page<RentalHistoryListResponse> borrowedHistory = rentalService.getBorrowedHistory(memberId, page, size);

        return ApiResponse.ok(borrowedHistory);
    }

    /**
     * 내가 대여해준 내역 조회 (내가 빌려준 내역)
     *
     * GET /rentals/lend/history
     *
     * 성능 최적화:
     * - Fetch Join으로 N+1 문제 해결
     * - Pagination으로 대용량 데이터 처리
     * - 읽기 전용 트랜잭션으로 성능 향상
     *
     * 정렬:
     * - rentalHisId 내림차순 고정 (최신순)
     *
     * 보안:
     * - JWT 인증 필수
     * - 본인이 소유한 상품의 대여 내역만 조회 가능
     *
     * @param authentication JWT 인증 정보
     * @param page 페이지 번호 (0부터 시작, default: 0)
     * @param size 페이지 크기 (default: 20)
     * @return 대여 내역 페이지
     */
    @GetMapping("/lend/history")
    public ResponseEntity<ApiResponse.SuccessBody<Page<RentalHistoryListResponse>>> getLendHistory(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rentals/lend/history] 내가 대여해준 내역 조회 : memberId={}, page={}, size={}",
                memberId, page, size);

        Page<RentalHistoryListResponse> lendHistory = rentalService.getLendHistory(memberId, page, size);

        return ApiResponse.ok(lendHistory);
    }
}
