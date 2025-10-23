package com.joying.account.service;

import com.joying.account.domain.Account;
import com.joying.account.domain.AccountState;
import com.joying.account.dto.AccountRegisterRequest;
import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerifyRequest;
import com.joying.account.repository.AccountRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 계좌 서비스
 *
 * 계좌 등록, 조회, 삭제 등의 비즈니스 로직 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {

	private final AccountRepository accountRepository;
	private final MemberRepository memberRepository;

	/**
	 * 내 계좌 목록 조회
	 *
	 * @param memberId 회원 ID
	 * @return 계좌 목록
	 */
	public List<AccountResponse> getMyAccounts(Long memberId) {
		List<Account> accounts = accountRepository.findByMember_MemberId(memberId);

		return accounts.stream()
			.map(AccountResponse::from)
			.collect(Collectors.toList());
	}

	/**
	 * 오픈뱅킹 계좌 인증 및 등록
	 *
	 * @param memberId 회원 ID
	 * @param request  계좌 인증 요청
	 * @return 등록된 계좌 정보
	 */
	@Transactional
	public AccountResponse verifyAndRegisterAccount(Long memberId, AccountVerifyRequest request) {
		Member member = findMemberById(memberId);

		// 핀테크 이용번호 중복 체크
		if (accountRepository.existsByFintechUseNum(request.getFintechUseNum())) {
			throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_REGISTERED);
		}

		// 계좌 상태 파싱 (오픈뱅킹 API 응답)
		AccountState accountState = AccountState.fromCode(request.getAccountState());

		// 오픈뱅킹 계좌 생성
		Account account = Account.builder()
			.member(member)
			.bankName(request.getBankName())
			.bankCodeStd(request.getBankCodeStd())
			.accountNum(request.getAccountNum())
			.fintechUseNum(request.getFintechUseNum())
			.accountHolderName(request.getAccountHolderName())
			.accountState(accountState)
			.build();

		// 계좌 인증 완료 처리
		account.verifyAccount();

		// 계좌 상태 확인
		if (!account.isUsable()) {
			log.warn("사용 불가능한 계좌 등록 시도: memberId={}, accountState={}",
				memberId, accountState);
		}

		// 연관관계 설정
		member.addAccount(account);

		Account savedAccount = accountRepository.save(account);

		log.info("계좌 인증 및 등록 완료: memberId={}, accountId={}, fintechUseNum={}",
			memberId, savedAccount.getAccountId(), request.getFintechUseNum());

		return AccountResponse.from(savedAccount);
	}

	/**
	 * 계좌 삭제
	 *
	 * @param memberId  회원 ID
	 * @param accountId 계좌 ID
	 */
	@Transactional
	public void deleteAccount(Long memberId, Long accountId) {
		Member member = findMemberById(memberId);
		Account account = findAccountById(accountId);

		// 본인 계좌인지 확인
		if (!account.getMember().getMemberId().equals(memberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		// 연관관계 제거
		member.removeAccount(account);

		accountRepository.delete(account);

		log.info("계좌 삭제 완료: memberId={}, accountId={}", memberId, accountId);
	}

	/**
	 * 회원 ID로 회원 조회 (내부 메서드)
	 *
	 * @param memberId 회원 ID
	 * @return Member
	 */
	private Member findMemberById(Long memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
	}

	/**
	 * 계좌 ID로 계좌 조회 (내부 메서드)
	 *
	 * @param accountId 계좌 ID
	 * @return Account
	 */
	private Account findAccountById(Long accountId) {
		return accountRepository.findById(accountId)
			.orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
	}
}