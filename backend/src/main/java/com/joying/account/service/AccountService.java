package com.joying.account.service;

import com.joying.account.domain.Account;
import com.joying.account.domain.AccountState;
import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.OpenBankingRealNameResponse;
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
	 * 회원의 계좌 목록 조회
	 *
	 * @param memberId        조회할 회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID
	 * @return 계좌 목록
	 */
	public List<AccountResponse> getMemberAccounts(Long memberId, Long currentMemberId) {
		// 본인의 계좌만 조회 가능
		if (!memberId.equals(currentMemberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		// 회원 존재 확인
		if (!memberRepository.existsById(memberId)) {
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}

		List<Account> accounts = accountRepository.findByMember_MemberId(memberId);

		return accounts.stream()
			.map(AccountResponse::from)
			.collect(Collectors.toList());
	}

	/**
	 * 1원 인증을 통한 계좌 등록
	 *
	 * @param memberId      회원 ID
	 * @param realNameResponse 오픈뱅킹 계좌실명조회 응답
	 * @return 등록된 계좌 정보
	 */
	@Transactional
	public AccountResponse registerAccountFromRealName(Long memberId, OpenBankingRealNameResponse realNameResponse) {
		Member member = findMemberById(memberId);

		// accountSeq 중복 체크
		if (accountRepository.existsByAccountSeq(realNameResponse.getAccountSeq())) {
			throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_REGISTERED);
		}

		// 같은 회원이 같은 계좌번호를 중복 등록하는지 체크
		if (accountRepository.existsByMember_MemberIdAndAccountNum(memberId, realNameResponse.getAccountNum())) {
			throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_REGISTERED);
		}

		// 계좌 타입 파싱 (1:수시입출금(ACTIVE), 2:예적금 등)
		AccountState accountState = "1".equals(realNameResponse.getAccountType())
			? AccountState.ACTIVE
			: AccountState.ACTIVE; // 일단 모두 ACTIVE로 처리

		// 1원 인증 계좌 생성
		Account account = Account.builder()
			.member(member)
			.bankName(realNameResponse.getBankName())
			.bankCodeStd(realNameResponse.getBankCodeStd())
			.accountNum(realNameResponse.getAccountNum())
			.accountSeq(realNameResponse.getAccountSeq())
			.accountHolderName(realNameResponse.getAccountHolderName())
			.accountState(accountState)
			.build();

		// 계좌 인증 완료 처리
		account.verifyAccount();

		// 연관관계 설정
		member.addAccount(account);

		Account savedAccount = accountRepository.save(account);

		log.info("1원 인증 계좌 등록 완료: memberId={}, accountId={}, accountSeq={}, bankName={}, holderName={}",
			memberId, savedAccount.getAccountId(), realNameResponse.getAccountSeq(),
			realNameResponse.getBankName(), realNameResponse.getAccountHolderName());

		return AccountResponse.from(savedAccount);
	}

	/**
	 * 계좌 삭제
	 *
	 * @param memberId        회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID
	 * @param accountId       계좌 ID
	 */
	@Transactional
	public void deleteAccount(Long memberId, Long currentMemberId, Long accountId) {
		// 본인의 계좌만 삭제 가능
		if (!memberId.equals(currentMemberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		Member member = findMemberById(memberId);
		Account account = findAccountById(accountId);

		// 계좌가 해당 회원의 것인지 확인
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