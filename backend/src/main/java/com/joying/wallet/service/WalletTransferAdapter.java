package com.joying.wallet.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.joying.wallet.port.MoneyTransferPort;
import com.joying.wallet.port.TransferOutcome;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 돈을 내부 원장에서 옮기는 구현. 기본값이다.
 *
 * <p>외부 금융망을 쓰던 자리를 대신한다. 밖으로 나가는 호출이 없으므로 응답을 못 받는
 * 일이 없고, 따라서 {@link TransferOutcome.Unconfirmed}를 돌려주지 않는다. 미확정을
 * 다루는 장치를 걷어내지 않고 그대로 둔 이유는, 그 상태가 필요 없어진 것이 아니라
 * 이 구현에서만 생기지 않기 때문이다. 외부 금융망 구현으로 되돌리면 다시 생긴다.
 *
 * <p>실제 계좌로 빼는 출금은 만들지 않았다. 그것만은 밖으로 나가는 호출이 필요하다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "joying.money.transfer", havingValue = "wallet", matchIfMissing = true)
public class WalletTransferAdapter implements MoneyTransferPort {

	private final WalletService walletService;

	@Override
	@Transactional
	public TransferOutcome creditToEscrow(long amount, String reference, String description) {
		Long escrowWalletId = walletService.getOrCreateEscrowWallet().getWalletId();
		return walletService.transfer(null, escrowWalletId, amount, reference, description);
	}

	@Override
	@Transactional
	public TransferOutcome transferFromEscrow(Long toMemberId, long amount,
											  String reference, String description) {
		if (toMemberId == null) {
			return new TransferOutcome.Rejected("NO_MEMBER", "받을 회원이 없다");
		}
		Long escrowWalletId = walletService.getOrCreateEscrowWallet().getWalletId();
		Long memberWalletId = walletService.getOrCreateMemberWallet(toMemberId).getWalletId();
		return walletService.transfer(escrowWalletId, memberWalletId, amount, reference, description);
	}

	@Override
	public String name() {
		return "wallet";
	}
}
