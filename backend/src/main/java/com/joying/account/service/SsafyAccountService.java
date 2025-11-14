package com.joying.account.service;

import com.joying.account.domain.AccountState;
import com.joying.account.domain.SsafyAccount;
import com.joying.account.dto.SsafyAccountResponse;
import com.joying.account.repository.SsafyAccountRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.ssafy.dto.CreateDemandDepositAccountResponse;
import com.joying.ssafy.dto.MemberRegisterResponse;
import com.joying.ssafy.service.FinanceApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * SSAFY 테스트 계좌 서비스
 *
 * SSAFY 금융망 API를 통한 테스트 계좌 생성 및 조회 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SsafyAccountService {

	private final SsafyAccountRepository ssafyAccountRepository;
	private final MemberRepository memberRepository;
	private final FinanceApiService financeApiService;

	/**
	 * SSAFY 테스트 계좌 생성
	 *
	 * @param memberId            회원 ID
	 * @param accountTypeUniqueNo 상품 고유번호
	 * @return 생성된 SSAFY 계좌 정보
	 */
	@Transactional
	public SsafyAccountResponse createSsafyAccount(Long memberId, String accountTypeUniqueNo) {
		Member member = findMemberById(memberId);

		// 예금주명 (실명 > 닉네임 순서로 사용)
		String accountHolderName = member.getName() != null ? member.getName() : member.getNickname();

		// SSAFY userKey가 없으면 먼저 등록
		if (member.getSsafyUserKey() == null) {
			log.info("SSAFY userKey가 없음. 회원 등록 시작: memberId={}, email={}",
				memberId, member.getEmail());

			// SSAFY 회원 등록 (userKey 자동 발급)
			MemberRegisterResponse registerResponse = financeApiService.registerMember(member.getEmail());

			// Member에 userKey 저장 (실명은 1원 인증 완료 시에만 저장)
			member.updateSsafyUserKey(registerResponse.getUserKey());

			log.info("SSAFY 회원 등록 및 userKey 발급 완료: memberId={}, userKey={}",
				memberId, registerResponse.getUserKey());
		}

		// SSAFY 계좌 생성 API 호출
		CreateDemandDepositAccountResponse.CreateDemandDepositAccountRec accountRec =
			financeApiService.createDemandDepositAccount(accountTypeUniqueNo, member.getSsafyUserKey());

		// 이미 등록된 계좌번호인지 확인
		if (ssafyAccountRepository.existsByAccountNo(accountRec.getAccountNo())) {
			log.error("이미 등록된 SSAFY 계좌입니다: accountNo={}", accountRec.getAccountNo());
			throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_REGISTERED);
		}

		// SsafyAccount 엔티티 생성
		SsafyAccount ssafyAccount = SsafyAccount.builder()
			.member(member)
			.accountTypeUniqueNo(accountTypeUniqueNo)
			.accountNo(accountRec.getAccountNo())
			.bankCode(accountRec.getBankCode())
			.accountHolderName(accountHolderName != null ? accountHolderName : "미인증")
			.accountState(AccountState.ACTIVE)
			.build();

		// 저장
		SsafyAccount savedAccount = ssafyAccountRepository.save(ssafyAccount);

		log.info("SSAFY 테스트 계좌 생성 완료: memberId={}, ssafyAccountId={}, accountNo={}",
			memberId, savedAccount.getSsafyAccountId(), accountRec.getAccountNo());

		return SsafyAccountResponse.from(savedAccount);
	}

	/**
	 * 회원의 SSAFY 계좌 목록 조회
	 *
	 * @param memberId        조회할 회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID
	 * @return SSAFY 계좌 목록
	 */
	public List<SsafyAccountResponse> getMemberSsafyAccounts(Long memberId, Long currentMemberId) {
		// 본인의 계좌만 조회 가능
		if (!memberId.equals(currentMemberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		// 회원 존재 확인
		if (!memberRepository.existsById(memberId)) {
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}

		List<SsafyAccount> ssafyAccounts = ssafyAccountRepository.findByMember_MemberId(memberId);

		return ssafyAccounts.stream()
			.map(SsafyAccountResponse::from)
			.collect(Collectors.toList());
	}

	/**
	 * SSAFY 계좌 삭제
	 *
	 * @param memberId        회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID
	 * @param ssafyAccountId  SSAFY 계좌 ID
	 */
	@Transactional
	public void deleteSsafyAccount(Long memberId, Long currentMemberId, Long ssafyAccountId) {
		// 본인의 계좌만 삭제 가능
		if (!memberId.equals(currentMemberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		Member member = findMemberById(memberId);
		SsafyAccount ssafyAccount = findSsafyAccountById(ssafyAccountId);

		// 계좌가 해당 회원의 것인지 확인
		if (!ssafyAccount.getMember().getMemberId().equals(memberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		ssafyAccountRepository.delete(ssafyAccount);

		log.info("SSAFY 계좌 삭제 완료: memberId={}, ssafyAccountId={}", memberId, ssafyAccountId);
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
	 * SSAFY 계좌 ID로 SSAFY 계좌 조회 (내부 메서드)
	 *
	 * @param ssafyAccountId SSAFY 계좌 ID
	 * @return SsafyAccount
	 */
	private SsafyAccount findSsafyAccountById(Long ssafyAccountId) {
		return ssafyAccountRepository.findById(ssafyAccountId)
			.orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
	}
}