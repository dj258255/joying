package com.joying.escrow.controller;

import com.joying.escrow.dto.request.EscrowCreateRequest;
import com.joying.escrow.dto.response.EscrowResponse;
import com.joying.escrow.service.EscrowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 에스크로 API 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/escrow")
@RequiredArgsConstructor
public class EscrowController {

    private final EscrowService escrowService;

    /**
     * 에스크로 홀드 생성
     *
     * POST /escrow/holds
     *
     * @deprecated 이 API는 더 이상 사용하지 않습니다.
     * Escrow는 PaymentConfirmFlow.confirm() 시 자동으로 생성됩니다.
     * 중복 생성을 방지하기 위해 이 엔드포인트를 사용하지 마세요.
     */
    @Deprecated
    @PostMapping("/holds")
    public ResponseEntity<EscrowResponse> createHold(
            @Valid @RequestBody EscrowCreateRequest request) {

        log.warn("[DEPRECATED] POST /escrow/holds 호출됨. 이 API는 deprecated되었습니다. " +
                "Escrow는 결제 확인 시 자동 생성됩니다.");
        log.info("[POST /escrow/holds] 에스크로 생성 요청: rentalHisId={}, paymentId={}",
                request.getRentalHisId(), request.getPaymentId());

        EscrowResponse response = escrowService.createHold(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * 에스크로 상태 조회
     *
     * GET /escrow/holds/{holdId}
     */
    @GetMapping("/holds/{holdId}")
    public ResponseEntity<EscrowResponse> getEscrow(@PathVariable Long holdId) {

        log.info("[GET /escrow/holds/{}] 에스크로 조회", holdId);

        EscrowResponse response = escrowService.getEscrow(holdId);

        return ResponseEntity.ok(response);
    }

    /**
     * 정산 처리 (대여료 지급 + 보증금 반환)
     *
     * POST /escrow/holds/{holdId}/settle
     */
    @PostMapping("/holds/{holdId}/settle")
    public ResponseEntity<EscrowResponse> settleEscrow(@PathVariable Long holdId) {

        log.info("[POST /escrow/holds/{}/settle] 정산 처리", holdId);

        EscrowResponse response = escrowService.settleEscrow(holdId);

        return ResponseEntity.ok(response);
    }
}
