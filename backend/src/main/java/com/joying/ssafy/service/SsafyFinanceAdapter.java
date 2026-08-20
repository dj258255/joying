package com.joying.ssafy.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.wallet.port.TransferOutcome;
import com.joying.wallet.port.MoneyTransferPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 돈을 외부 금융망으로 옮기는 구현.
 *
 * <p>기본으로 켜지지 않는다. 이 프로젝트가 쓰던 SSAFY 금융망 교육용 API는 더 이상
 * 붙을 수 없어, 지금 돈을 옮기는 자리는 내부 원장 구현이 맡는다.
 * {@code joying.money.transfer=ssafy}로 두면 이쪽이 다시 붙는다.
 *
 * <p>코드를 지우지 않고 남긴 이유는, 밖으로 나가는 호출이 있을 때만 생기는 문제들
 * 이 여기에 담겨 있기 때문이다. 타임아웃, 응답을 못 받았을 때의 미확정, 미확정을
 * 다시 물어 확정하는 복구가 그것이다. 내부 원장으로 옮기면서 그 문제들이 사라진
 * 것이 아니라, 경계를 안으로 들여서 겪지 않게 된 것이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "joying.money.transfer", havingValue = "ssafy")
public class SsafyFinanceAdapter implements MoneyTransferPort {

	private final FinanceApiService financeApiService;
	private final FinanceApiProperties financeApiProperties;

	@Override
	public TransferOutcome creditToEscrow(long amount, String reference, String description) {
		return financeApiService.depositMoney(
			financeApiProperties.getEscrow().getAccountNo(),
			amount,
			description,
			financeApiProperties.getEscrow().getUserKey());
	}

	@Override
	public TransferOutcome transferFromEscrow(Long toMemberId, long amount,
											  String reference, String description) {
		throw new UnsupportedOperationException(
			"회원 계좌번호를 받아야 송금할 수 있다. 계좌 등록 경로가 살아난 뒤에 잇는다.");
	}

	@Override
	public String name() {
		return "ssafy";
	}
}
