package com.joying.escrow.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.escrow.domain.Escrow;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.payment.port.DepositHoldPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 보증금 반환을 요청한 뒤 실제로 반영됐는지 확인한다.
 *
 * <p>부분취소는 매입 뒤에 도는 절차라 카드사에 반영되기까지 영업일이 걸린다. 요청이
 * 받아들여진 것과 고객 카드에 반영된 것은 다르고, 그 사이에 실패할 수 있다.
 *
 * <p>확정 근거는 결제에 남아 있는 금액이다. 되돌린 만큼 줄어 있으면 반영된 것이다.
 * 조회가 실패하면 아무것도 확정하지 않는다. 실패를 "반영되지 않았다"로 읽으면 안 된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepositReleaseConfirmationService {

	private final EscrowRepository escrowRepository;
	private final DepositHoldPort depositHoldPort;

	@Scheduled(fixedDelayString = "${joying.escrow.release-confirmation.interval-ms:300000}")
	@Transactional
	public void confirmRequestedReleases() {
		List<Escrow> pending =
			escrowRepository.findByDepositReleaseRequestedAtIsNotNullAndDepositReleaseConfirmedAtIsNull();
		if (pending.isEmpty()) {
			return;
		}

		log.info("[보증금 반환 확인] 대상 {}건", pending.size());

		int confirmed = 0;
		for (Escrow escrow : pending) {
			String paymentKey = escrow.getPayment() == null ? null : escrow.getPayment().getPaymentKey();
			if (paymentKey == null) {
				log.warn("[보증금 반환 확인] 결제 정보가 없다: escrowId={}", escrow.getHoldId());
				continue;
			}

			Optional<Long> remaining = depositHoldPort.remainingAmount(paymentKey);
			if (remaining.isEmpty()) {
				// 모른다. 다음 주기에 다시 묻는다.
				continue;
			}

			long expected = expectedRemainingAfterRelease(escrow);
			if (remaining.get() <= expected) {
				escrow.confirmDepositRelease(Timestamp.from(Instant.now()));
				confirmed++;
				log.info("[보증금 반환 확인됨] escrowId={}, 남은금액={}, 기대={}",
					escrow.getHoldId(), remaining.get(), expected);
			} else {
				log.info("[보증금 반환 아직 미반영] escrowId={}, 남은금액={}, 기대={}",
					escrow.getHoldId(), remaining.get(), expected);
			}
		}

		log.info("[보증금 반환 확인] 확정 {}건, 미확인 {}건", confirmed, pending.size() - confirmed);
	}

	/**
	 * 보증금이 다 빠지고 나면 결제에 남아 있어야 하는 금액.
	 *
	 * <p>대여료는 그대로 남고 보증금만 줄어든다.
	 */
	private long expectedRemainingAfterRelease(Escrow escrow) {
		return escrow.getRentalFee() == null ? 0L : escrow.getRentalFee().longValue();
	}
}
