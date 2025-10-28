package com.joying.account.service;

import com.joying.account.domain.Account;
import com.joying.account.domain.AccountState;
import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerificationResponse;
import com.joying.account.dto.AccountVerificationStartResponse;
import com.joying.account.dto.DemandDepositProductResponse;
import com.joying.account.repository.AccountRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.ssafy.dto.CheckAuthCodeResponse;
import com.joying.ssafy.dto.CreateDemandDepositAccountResponse;
import com.joying.ssafy.dto.InquireDemandDepositListResponse;
import com.joying.ssafy.service.FinanceApiService;
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
	private final FinanceApiService financeApiService;

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
	 * 1원 인증 시작 (1원 송금)
	 *
	 * @param memberId  회원 ID
	 * @param accountNo 계좌번호
	 * @return 인증 시작 응답
	 */
	@Transactional
	public AccountVerificationStartResponse startAccountVerification(Long memberId, String accountNo) {
		Member member = findMemberById(memberId);

		// SSAFY userKey가 없으면 먼저 등록
		if (member.getSsafyUserKey() == null) {
			log.info("SSAFY userKey가 없음. 회원 등록 시작: memberId={}, email={}",
				memberId, member.getEmail());

			// SSAFY 회원 등록 (userKey 자동 발급)
			String userKey = financeApiService.registerMember(member.getEmail());

			// Member에 userKey 저장
			member.updateSsafyUserKey(userKey);

			log.info("SSAFY 회원 등록 및 userKey 발급 완료: memberId={}, userKey={}", memberId, userKey);
		}

		// 1원 송금 (계좌 인증 시작)
		financeApiService.openAccountAuth(accountNo, member.getSsafyUserKey());

		log.info("1원 인증 시작 성공: memberId={}, accountNo={}", memberId, accountNo);

		return AccountVerificationStartResponse.builder()
			.accountNo(accountNo)
			.message("1원이 송금되었습니다. 입금자명에 표시된 6자리 인증 코드를 입력해주세요.")
			.build();
	}

	/**
	 * 1원 인증 완료 (authCode 검증, 실명 저장, 계좌 생성)
	 *
	 * @param memberId  회원 ID
	 * @param accountNo 계좌번호
	 * @param authCode  인증 코드
	 * @return 인증 결과 (실명 포함)
	 */
	@Transactional
	public AccountVerificationResponse completeAccountVerification(Long memberId, String accountNo, String authCode) {
		Member member = findMemberById(memberId);

		if (member.getSsafyUserKey() == null) {
			log.error("SSAFY userKey가 없음: memberId={}", memberId);
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}

		// 이미 등록된 계좌인지 확인
		if (accountRepository.existsByAccountNo(accountNo)) {
			log.error("이미 등록된 계좌입니다: accountNo={}", accountNo);
			throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_REGISTERED);
		}

		// 1원 인증 확인 (authCode 검증 및 계좌 정보 반환)
		CheckAuthCodeResponse.CheckAuthCodeRec authResult = financeApiService.checkAuthCode(
			accountNo,
			authCode,
			member.getSsafyUserKey()
		);

		String realName = authResult.getUserName();

		// 회원의 실명 업데이트 (최초 1회만)
		if (member.getName() == null) {
			member.updateRealName(realName);
			log.info("회원 실명 최초 저장: memberId={}, realName={}", memberId, realName);
		}

		// Account 엔티티 생성 (1원 인증 완료된 계좌)
		Account account = Account.builder()
			.member(member)
			.bankName(authResult.getBankName())
			.bankCode(authResult.getBankCode())
			.accountNo(authResult.getAccountNo())
			.accountHolderName(realName)
			.accountState(AccountState.ACTIVE)
			.balance(0L) // 초기 잔액 0원
			.build();

		// 계좌 인증 완료 처리
		account.verifyAccount();

		// Member와 Account 연관관계 설정
		member.addAccount(account);

		// Account 저장
		accountRepository.save(account);

		log.info("1원 인증 완료 및 계좌 등록: memberId={}, accountNo={}, realName={}, bankName={}",
			memberId, authResult.getAccountNo(), realName, authResult.getBankName());

		return AccountVerificationResponse.builder()
			.accountNo(authResult.getAccountNo())
			.realName(realName)
			.verified(true)
			.message("계좌 인증이 완료되었습니다.")
			.build();
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
	 * 수시입출금 상품 목록 조회
	 *
	 * @return 수시입출금 상품 목록
	 */
	public List<DemandDepositProductResponse> getDemandDepositProducts() {
		InquireDemandDepositListResponse response = financeApiService.inquireDemandDepositList();

		if (response.getRec() == null || response.getRec().isEmpty()) {
			log.warn("수시입출금 상품이 없습니다");
			return List.of();
		}

		return response.getRec().stream()
			.map(product -> DemandDepositProductResponse.builder()
				.bankCode(product.getBankCode())
				.bankName(product.getBankName())
				.accountTypeUniqueNo(product.getAccountTypeUniqueNo())
				.accountTypeName(product.getAccountTypeName())
				.accountDescription(product.getAccountDescription())
				.build())
			.collect(Collectors.toList());
	}

	/**
	 * SSAFY 수시입출금 계좌 생성
	 *
	 * @param memberId            회원 ID
	 * @param accountTypeUniqueNo 상품 고유번호
	 * @return 생성된 계좌 정보
	 */
	@Transactional
	public AccountResponse createDemandDepositAccount(Long memberId, String accountTypeUniqueNo) {
		Member member = findMemberById(memberId);

		// SSAFY userKey가 없으면 먼저 등록
		if (member.getSsafyUserKey() == null) {
			log.info("SSAFY userKey가 없음. 회원 등록 시작: memberId={}, email={}",
				memberId, member.getEmail());

			// SSAFY 회원 등록 (userKey 자동 발급)
			String userKey = financeApiService.registerMember(member.getEmail());

			// Member에 userKey 저장
			member.updateSsafyUserKey(userKey);

			log.info("SSAFY 회원 등록 및 userKey 발급 완료: memberId={}, userKey={}", memberId, userKey);
		}

		// SSAFY 계좌 생성
		CreateDemandDepositAccountResponse.CreateDemandDepositAccountRec accountRec =
			financeApiService.createDemandDepositAccount(accountTypeUniqueNo, member.getSsafyUserKey());

		// Account 엔티티 생성 (SSAFY 테스트 계좌)
		Account account = Account.builder()
			.member(member)
			.bankName("SSAFY은행") // SSAFY 테스트 계좌
			.bankCode(accountRec.getBankCode())
			.accountNo(accountRec.getAccountNo())
			.accountHolderName(member.getName() != null ? member.getName() : "미인증")
			.accountState(AccountState.ACTIVE)
			.balance(0L)
			.build();

		// 연관관계 설정
		member.addAccount(account);

		Account savedAccount = accountRepository.save(account);

		log.info("SSAFY 계좌 생성 완료: memberId={}, accountId={}, accountNo={}",
			memberId, savedAccount.getAccountId(), accountRec.getAccountNo());

		return AccountResponse.from(savedAccount);
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