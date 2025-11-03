package com.joying.rental.controller;

import com.joying.common.response.ApiResponse;
import com.joying.rental.dto.request.ReservationCreateRequest;
import com.joying.rental.dto.request.ShipRequest;
import com.joying.rental.dto.response.ConfirmReceiveResponse;
import com.joying.rental.dto.response.RentalDetailResponse;
import com.joying.rental.dto.response.ReservationCreateResponse;
import com.joying.rental.dto.response.ShipResponse;
import com.joying.rental.service.RentalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
        log.info("[POST /rentals/{}/reservations] 대여 생성 요청: memberId={}",
                productId, memberId);

        ReservationCreateResponse response = rentalService.createReservation(
                productId,
                request,
                memberId
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
     * 나의 대여 내역 확인
     *
     * GET /rentals/borrowed/history
     */
    @GetMapping("/rentals/borrowed/history")
    public ResponseEntity<ApiResponse.SuccessBody<List<RentalDetailResponse>>> getRentalHistory(
            Authentication authentication
    ){
        Long memberId = Long.parseLong(authentication.getName());
        log.info("[GET /rentals/borrowed/history] 나의 대여 내역 요청 : memberId={}",memberId);

        List<RentalDetailResponse> borrowList = rentalService.getRentalList(memberId);
        return ApiResponse.ok(borrowList);
    }
}
