package com.joying.escrow.service;

import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.escrow.domain.Escrow;
import com.joying.escrow.domain.Status;
import com.joying.escrow.repository.EscrowRepository;
import com.joying.wallet.domain.Wallet;
import com.joying.wallet.service.WalletService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 매일 장부를 검산한다.
 *
 * <p>결제와 취소와 정산이 각각 돌지만 셋을 맞춰 보는 곳이 없었다. 어긋나도 알 방법이
 * 없다는 뜻이다. 에러가 나지 않는 사고는 이렇게 조용히 쌓인다.
 *
 * <p>검산식은 하나다.
 *
 * <pre>
 *   중개 지갑 잔액 == 아직 대여자에게 나가지 않은 대여료의 합
 * </pre>
 *
 * <p>보증금은 이 식에 없다. 플랫폼 장부를 지나지 않기 때문이다. 보증금이 여기 나타나면
 * 어딘가에서 다시 우리 장부로 들어오고 있다는 뜻이므로, 그것 자체가 잡아야 할 신호다.
 *
 * <p>원장을 더한 값도 함께 본다. 지갑 행의 잔액과 원장 합계가 어긋나면 원장이 맞다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementReconciliationService {

	private final EscrowRepository escrowRepository;
	private final WalletService walletService;

	@Scheduled(cron = "${joying.escrow.reconciliation.cron:0 10 4 * * *}", zone = "Asia/Seoul")
	@Transactional(readOnly = true)
	public ReconciliationResult reconcile() {
		Wallet escrowWallet = walletService.getOrCreateEscrowWallet();
		long walletBalance = escrowWallet.getBalance();
		long ledgerBalance = walletService.balanceFromLedger(escrowWallet.getWalletId());

		long unsettledRentalFee = unsettledRentalFeeTotal();

		ReconciliationResult result =
			new ReconciliationResult(walletBalance, ledgerBalance, unsettledRentalFee);

		if (result.isBalanced()) {
			log.info("[대사] 맞음. 지갑={}, 원장={}, 미정산 대여료={}",
				walletBalance, ledgerBalance, unsettledRentalFee);
		} else {
			// 조용히 넘기지 않는다. 하루 단위로 벌어지면 원인을 되짚기 어려워진다.
			log.error("[대사 불일치] 지갑={}, 원장={}, 미정산 대여료={}, 지갑-원장={}, 지갑-미정산={}",
				walletBalance, ledgerBalance, unsettledRentalFee,
				result.walletMinusLedger(), result.walletMinusUnsettled());
		}
		return result;
	}

	/**
	 * 적립은 됐지만 아직 대여자에게 나가지 않은 대여료의 합.
	 */
	private long unsettledRentalFeeTotal() {
		List<Escrow> held = escrowRepository.findByStatus(Status.HELD);
		List<Escrow> rentalStarted = escrowRepository.findByStatus(Status.RENTAL_STARTED);
		List<Escrow> returnStarted = escrowRepository.findByStatus(Status.RETURN_STARTED);

		return sumRentalFeeNotYetSent(held)
			+ sumRentalFeeNotYetSent(rentalStarted)
			+ sumRentalFeeNotYetSent(returnStarted);
	}

	private long sumRentalFeeNotYetSent(List<Escrow> escrows) {
		return escrows.stream()
			.filter(e -> !e.isRentalFeeSent())
			.mapToLong(e -> e.getRentalFee() == null ? 0L : e.getRentalFee().longValue())
			.sum();
	}

	/**
	 * 검산 결과.
	 *
	 * @param walletBalance     지갑 행이 들고 있는 잔액
	 * @param ledgerBalance     원장을 더해 나온 잔액
	 * @param unsettledRentalFee 아직 나가지 않은 대여료의 합
	 */
	public record ReconciliationResult(long walletBalance, long ledgerBalance, long unsettledRentalFee) {

		public long walletMinusLedger() {
			return walletBalance - ledgerBalance;
		}

		public long walletMinusUnsettled() {
			return walletBalance - unsettledRentalFee;
		}

		public boolean isBalanced() {
			return walletMinusLedger() == 0 && walletMinusUnsettled() == 0;
		}
	}
}
