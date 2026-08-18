package com.joying.escrow.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.escrow.domain.Escrow;
import com.joying.escrow.domain.Status;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.ssafy.dto.InquireTransactionHistoryResponse;
import com.joying.ssafy.service.FinanceApiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 에스크로 입금이 미확정으로 남은 건을 금융망에 다시 물어 확정한다.
 *
 * <p>입금 호출이 타임아웃 나면 돈이 들어갔는지 알 수 없다. 그 자리에서 실패로 확정하면
 * 실제로 들어간 돈을 장부에서 지우게 되므로 되돌리지 않고 {@code PENDING}으로 남긴다.
 * 남긴 건을 닫는 것이 이 작업이다.
 *
 * <p>미확정 건은 거래고유번호를 받지 못했으므로 단건 조회로는 확인할 수 없다. 대신
 * 입금할 때 거래 요약에 주문번호를 심어 두었고, 계좌의 기간별 거래 목록에서 그 주문번호로
 * 찾는다. 같은 주문번호로 두 번 입금되는 일이 없으므로 이 요약이 사실상의 열쇠가 된다.
 *
 * <p>내부 원장으로 돈을 옮길 때는 이 작업이 돌지 않는다. 커밋되거나 롤백되거나
 * 둘뿐이라 미확정이 생기지 않기 때문이다. 외부 금융망 구현을 켤 때만 함께 켜진다.
 *
 * <p>찾지 못했다고 해서 실패로 확정하지 않는다. 조회가 실패했을 수도 있고 금융망 반영이
 * 늦을 수도 있다. 확정할 근거가 없으면 그대로 두고 다음 주기에 다시 묻는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "joying.money.transfer", havingValue = "ssafy")
public class EscrowDepositRecoveryService {

	private static final DateTimeFormatter YYYYMMDD = DateTimeFormatter.ofPattern("yyyyMMdd");

	/**
	 * 이 시간이 지나도록 확정되지 않은 건은 사람이 봐야 한다.
	 */
	private static final Duration NEEDS_ATTENTION_AFTER = Duration.ofMinutes(10);

	private final EscrowRepository escrowRepository;
	private final FinanceApiService financeApiService;
	private final FinanceApiProperties financeApiProperties;

	@Scheduled(fixedDelayString = "${joying.escrow.deposit-recovery.interval-ms:60000}")
	@Transactional
	public void confirmUnconfirmedDeposits() {
		List<Escrow> unconfirmed = escrowRepository.findByStatus(Status.PENDING);
		if (unconfirmed.isEmpty()) {
			return;
		}

		log.info("[에스크로 입금 재조회] 대상 {}건", unconfirmed.size());

		String escrowAccountNo = financeApiProperties.getEscrow().getAccountNo();
		String escrowUserKey = financeApiProperties.getEscrow().getUserKey();

		// 조회 창을 가장 오래된 미확정 건의 생성 시각까지로 넓힌다. 창이 좁으면 실제로 들어온
		// 입금을 못 찾고, 못 찾은 것을 근거로 무언가 판단하면 그 판단이 틀린다.
		String startDate = earliestCreatedDate(unconfirmed).format(YYYYMMDD);
		String endDate = LocalDate.now().format(YYYYMMDD);

		List<InquireTransactionHistoryResponse.TransactionRec> transactions;
		try {
			transactions = financeApiService.inquireTransactionHistoryList(
				escrowAccountNo, startDate, endDate, escrowUserKey);
		} catch (Exception e) {
			// 조회가 실패한 것을 "거래가 없었다"로 읽으면 안 된다. 아무것도 확정하지 않고 물러난다.
			log.error("[에스크로 입금 재조회] 거래내역 조회 실패. 이번 주기에는 확정하지 않는다", e);
			return;
		}

		int confirmed = 0;
		int needsAttention = 0;
		for (Escrow escrow : unconfirmed) {
			String orderId = orderIdOf(escrow);
			if (orderId == null) {
				log.warn("[에스크로 입금 재조회] 주문번호가 없어 찾을 수 없다: escrowId={}", escrow.getHoldId());
				continue;
			}

			InquireTransactionHistoryResponse.TransactionRec matched = transactions.stream()
				.filter(tx -> tx.getTransactionSummary() != null
					&& tx.getTransactionSummary().contains(orderId))
				.findFirst()
				.orElse(null);

			if (matched != null) {
				escrow.markHeld(matched.getTransactionUniqueNo());
				confirmed++;
				log.info("[에스크로 입금 확정] escrowId={}, orderId={}, txNo={}",
					escrow.getHoldId(), orderId, matched.getTransactionUniqueNo());
				continue;
			}

			// 조회 창이 이 건의 생성 시각을 덮고 있는데도 거래가 없다면 입금이 실제로 나가지
			// 않은 것이다. 그래도 여기서 자동으로 다시 보내지는 않는다. 없다는 것을 근거로
			// 돈을 옮기는 판단은, 조회가 정말 전부를 보여 준다는 것을 확인한 뒤에 켠다.
			if (isOlderThan(escrow, NEEDS_ATTENTION_AFTER)) {
				needsAttention++;
				log.error("[에스크로 입금 미확정 장기화 - 사람이 확인해야 함] escrowId={}, orderId={}, 생성={}",
					escrow.getHoldId(), orderId, escrow.getCreatedAt());
			} else {
				log.info("[에스크로 입금 재조회] 아직 확인되지 않음: escrowId={}, orderId={}",
					escrow.getHoldId(), orderId);
			}
		}

		log.info("[에스크로 입금 재조회] 확정 {}건, 미확정 {}건 (그중 장기 {}건)",
			confirmed, unconfirmed.size() - confirmed, needsAttention);
	}

	/**
	 * 가장 오래된 미확정 건의 생성 날짜. 생성 시각을 모르는 건이 있으면 전날까지 넓힌다.
	 */
	private LocalDate earliestCreatedDate(List<Escrow> escrows) {
		LocalDate fallback = LocalDate.now().minusDays(1);
		return escrows.stream()
			.map(Escrow::getCreatedAt)
			.map(ts -> ts == null ? null : ts.toLocalDateTime().toLocalDate())
			.map(d -> d == null ? fallback : d)
			.min(LocalDate::compareTo)
			.orElse(fallback);
	}

	private boolean isOlderThan(Escrow escrow, Duration duration) {
		return escrow.getCreatedAt() != null
			&& escrow.getCreatedAt().toInstant().isBefore(Instant.now().minus(duration));
	}

	private String orderIdOf(Escrow escrow) {
		return escrow.getPayment() == null ? null : escrow.getPayment().getOrderId();
	}
}
