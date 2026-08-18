package com.joying.wallet.service;

import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.joying.ssafy.dto.TransferOutcome;
import com.joying.wallet.domain.EntryDirection;
import com.joying.wallet.domain.Wallet;
import com.joying.wallet.domain.WalletEntry;
import com.joying.wallet.domain.WalletOwnerType;
import com.joying.wallet.domain.WalletTransfer;
import com.joying.wallet.repository.WalletEntryRepository;
import com.joying.wallet.repository.WalletRepository;
import com.joying.wallet.repository.WalletTransferRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 지갑 사이에서 돈을 옮긴다.
 *
 * <p>옮기는 일은 한 트랜잭션 안에서 끝난다. 커밋되면 옮겨진 것이고 롤백되면 옮겨지지
 * 않은 것이라, 옮겨졌는지 모르는 상태가 생기지 않는다. 그래서 이 서비스는
 * {@link TransferOutcome.Unconfirmed}를 돌려주지 않는다.
 *
 * <p>순서가 중요하다. 이체 기록을 먼저 넣어 같은 참조가 두 번 들어오는 것을 DB
 * 제약으로 막고, 그다음에 잔액을 뺀다. 잔액이 모자라면 방금 넣은 이체 기록을 지운다.
 * 예외를 던져 롤백하지 않는 이유는, 이 메서드를 부르는 쪽이 같은 트랜잭션 안에 있어
 * 롤백 표시가 그쪽 작업까지 되돌리기 때문이다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

	private final WalletRepository walletRepository;
	private final WalletTransferRepository transferRepository;
	private final WalletEntryRepository entryRepository;

	/**
	 * 회원 지갑을 가져온다. 없으면 만든다.
	 */
	@Transactional
	public Wallet getOrCreateMemberWallet(Long memberId) {
		return walletRepository.findByOwnerTypeAndMemberId(WalletOwnerType.MEMBER, memberId)
			.orElseGet(() -> createWallet(Wallet.forMember(memberId),
				() -> walletRepository.findByOwnerTypeAndMemberId(WalletOwnerType.MEMBER, memberId)));
	}

	/**
	 * 중개가 거래 중인 돈을 들고 있는 지갑. 하나만 있다.
	 */
	@Transactional
	public Wallet getOrCreateEscrowWallet() {
		return walletRepository.findFirstByOwnerType(WalletOwnerType.ESCROW)
			.orElseGet(() -> createWallet(Wallet.forEscrow(),
				() -> walletRepository.findFirstByOwnerType(WalletOwnerType.ESCROW)));
	}

	private Wallet createWallet(Wallet wallet, java.util.function.Supplier<Optional<Wallet>> reload) {
		try {
			return walletRepository.saveAndFlush(wallet);
		} catch (DataIntegrityViolationException e) {
			// 같은 지갑을 동시에 만들려 한 것이다. 유니크 제약이 한쪽만 통과시켰다.
			return reload.get().orElseThrow(() -> e);
		}
	}

	/**
	 * 돈을 옮긴다.
	 *
	 * @param fromWalletId 보내는 지갑. null이면 시스템 밖에서 들어온 것
	 * @param toWalletId   받는 지갑. null이면 시스템 밖으로 나가는 것
	 * @param reference    이 이체를 가리키는 값. 같은 값으로 두 번 불러도 한 번만 옮긴다
	 */
	@Transactional
	public TransferOutcome transfer(Long fromWalletId, Long toWalletId, long amount,
									String reference, String description) {
		if (amount <= 0) {
			return new TransferOutcome.Rejected("INVALID_AMOUNT", "옮길 금액이 0 이하다: " + amount);
		}
		if (fromWalletId == null && toWalletId == null) {
			return new TransferOutcome.Rejected("NO_WALLET", "보내는 곳과 받는 곳이 모두 비어 있다");
		}

		Optional<WalletTransfer> already = transferRepository.findByReference(reference);
		if (already.isPresent()) {
			log.info("[지갑] 이미 처리된 이체다: reference={}, transferId={}",
				reference, already.get().getTransferId());
			return new TransferOutcome.Succeeded(String.valueOf(already.get().getTransferId()));
		}

		WalletTransfer transfer;
		try {
			transfer = transferRepository.saveAndFlush(
				WalletTransfer.of(fromWalletId, toWalletId, amount, reference, description));
		} catch (DataIntegrityViolationException e) {
			// 같은 참조가 동시에 들어왔고 다른 쪽이 먼저 넣었다. 돈은 그쪽이 옮긴다.
			return transferRepository.findByReference(reference)
				.map(t -> (TransferOutcome) new TransferOutcome.Succeeded(String.valueOf(t.getTransferId())))
				.orElseGet(() -> new TransferOutcome.Rejected("DUPLICATE_REFERENCE", reference));
		}

		if (fromWalletId != null) {
			int withdrawn = walletRepository.withdrawIfEnough(fromWalletId, amount);
			if (withdrawn == 0) {
				// 잔액이 모자라거나 그런 지갑이 없다. 방금 넣은 이체 기록을 되돌린다.
				transferRepository.delete(transfer);
				transferRepository.flush();
				log.warn("[지갑] 잔액 부족으로 이체하지 않았다: walletId={}, amount={}, reference={}",
					fromWalletId, amount, reference);
				return new TransferOutcome.Rejected("INSUFFICIENT_BALANCE",
					"잔액이 모자라거나 지갑이 없다: walletId=" + fromWalletId);
			}
			writeEntry(fromWalletId, transfer.getTransferId(), EntryDirection.DEBIT, amount);
		}

		if (toWalletId != null) {
			int deposited = walletRepository.deposit(toWalletId, amount);
			if (deposited == 0) {
				// 받는 지갑이 없다. 여기서 멈추면 보낸 쪽만 줄어드므로 예외를 던져 되돌린다.
				throw new IllegalStateException("받는 지갑이 없다: walletId=" + toWalletId);
			}
			writeEntry(toWalletId, transfer.getTransferId(), EntryDirection.CREDIT, amount);
		}

		log.info("[지갑] 이체 완료: {} → {}, amount={}, reference={}",
			fromWalletId, toWalletId, amount, reference);
		return new TransferOutcome.Succeeded(String.valueOf(transfer.getTransferId()));
	}

	private void writeEntry(Long walletId, Long transferId, EntryDirection direction, long amount) {
		long balanceAfter = walletRepository.findById(walletId)
			.map(Wallet::getBalance)
			.orElseThrow(() -> new IllegalStateException("지갑이 사라졌다: walletId=" + walletId));
		entryRepository.save(WalletEntry.of(walletId, transferId, direction, amount, balanceAfter));
	}

	/**
	 * 원장을 더해 나온 잔액. 지갑 행의 잔액과 어긋나면 원장이 맞다.
	 */
	@Transactional(readOnly = true)
	public long balanceFromLedger(Long walletId) {
		return entryRepository.findByWalletIdOrderByEntryIdAsc(walletId).stream()
			.mapToLong(e -> e.getDirection() == EntryDirection.CREDIT ? e.getAmount() : -e.getAmount())
			.sum();
	}
}
