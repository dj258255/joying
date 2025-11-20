package com.joying.account.service;

import com.joying.account.domain.Account;
import com.joying.account.domain.AccountState;
import com.joying.account.dto.AccountResponse;
import com.joying.account.dto.AccountVerificationResponse;
import com.joying.account.dto.AccountVerificationStartResponse;
import com.joying.account.dto.DemandDepositProductResponse;
import com.joying.account.dto.SsafyTransactionResponse;
import com.joying.account.repository.AccountRepository;
import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.ssafy.dto.CheckAuthCodeResponse;
import com.joying.ssafy.dto.InquireDemandDepositListResponse;
import com.joying.ssafy.dto.InquireTransactionHistoryResponse;
import com.joying.ssafy.dto.MemberRegisterResponse;
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
	@Transactional
	public List<AccountResponse> getMemberAccounts(Long memberId, Long currentMemberId) {
		// 본인의 계좌만 조회 가능
		if (!memberId.equals(currentMemberId)) {
			throw new BusinessException(ErrorCode.ACCOUNT_NOT_AUTHORIZED);
		}

		// 회원 존재 확인
		Member member = findMemberById(memberId);

		List<Account> accounts = accountRepository.findByMember_MemberId(memberId);

		// SSAFY API로 실제 예금주명 조회 및 업데이트
		if (member.getSsafyUserKey() != null) {
			for (Account account : accounts) {
				try {
					// SSAFY API로 실제 예금주명 조회
					String realAccountHolderName = financeApiService.inquireDemandDepositAccountHolderName(
						account.getAccountNo(),
						member.getSsafyUserKey()
					);

					// DB에 저장된 예금주명과 다르면 업데이트
					if (!realAccountHolderName.equals(account.getAccountHolderName())) {
						account.updateAccountInfo(account.getBankName(), account.getBankCode(), realAccountHolderName);
						log.info("계좌 예금주명 갱신: accountNo={}, 기존={}, 신규={}",
							account.getAccountNo(), account.getAccountHolderName(), realAccountHolderName);
					}
				} catch (Exception e) {
					// API 조회 실패 시 기존 값 유지
					log.warn("예금주명 조회 실패 (기존 값 유지): accountNo={}, error={}",
						account.getAccountNo(), e.getMessage());
				}
			}
		}

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
			MemberRegisterResponse registerResponse = financeApiService.registerMember(member.getEmail());

			// Member에 userKey 저장 (실명은 1원 인증 완료 시에만 저장)
			member.updateSsafyUserKey(registerResponse.getUserKey());

			log.info("SSAFY 회원 등록 및 userKey 발급 완료: memberId={}, userKey={}",
				memberId, registerResponse.getUserKey());
		}

		// 1원 송금 (계좌 인증 시작)
		String transactionUniqueNo = financeApiService.openAccountAuth(accountNo, member.getSsafyUserKey());

		log.info("1원 인증 시작 성공: memberId={}, accountNo={}, transactionUniqueNo={}",
			memberId, accountNo, transactionUniqueNo);

		return AccountVerificationStartResponse.builder()
			.accountNo(accountNo)
			.transactionUniqueNo(transactionUniqueNo)
			.message("1원이 송금되었습니다. 입금자명에 표시된 4자리 인증 코드를 5분 이내에 입력해주세요.")
			.build();
	}

	/**
	 * 1원 인증 완료 (authCode 검증, 실명 저장, 계좌 생성)
	 *
	 * @param memberId          회원 ID
	 * @param accountNo         계좌번호
	 * @param authCode          인증 코드
	 * @param accountHolderName 예금주명 (사용자 입력) - 참고용
	 * @return 인증 결과 (실명 포함)
	 */
	@Transactional
	public AccountVerificationResponse completeAccountVerification(Long memberId, String accountNo, String authCode, String accountHolderName) {
		Member member = findMemberById(memberId);

		if (member.getSsafyUserKey() == null) {
			log.error("SSAFY userKey가 없음: memberId={}", memberId);
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}

		// 1원 인증 확인 (authCode 검증)
		CheckAuthCodeResponse.CheckAuthCodeRec authResult = financeApiService.checkAuthCode(
			accountNo,
			authCode,
			member.getSsafyUserKey()
		);

		// 인증 실패 시 예외 처리
		if (!"SUCCESS".equals(authResult.getStatus())) {
			log.error("1원 인증 실패: memberId={}, accountNo={}, status={}", memberId, accountNo, authResult.getStatus());
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}

		// SSAFY API로 실제 예금주명 조회
		String realAccountHolderName = financeApiService.inquireDemandDepositAccountHolderName(
			accountNo,
			member.getSsafyUserKey()
		);

		log.info("SSAFY API 예금주명 조회 성공: accountNo={}, realName={}, 사용자입력={}",
			accountNo, realAccountHolderName, accountHolderName);

		// 계좌번호에서 은행코드 추출 (앞 3자리)
		String bankCode = accountNo.substring(0, 3);
		String bankName = getBankNameByCode(bankCode);

		// 검증된 실명으로 업데이트 (SSAFY API에서 조회한 실제 예금주명 사용)
		member.updateRealName(realAccountHolderName);
		log.info("회원 실명 저장/갱신: memberId={}, realName={}", memberId, realAccountHolderName);

		// 기존 계좌가 있으면 업데이트, 없으면 새로 생성
		Account account = accountRepository.findByAccountNo(accountNo)
			.orElse(null);

		if (account != null) {
			// 기존 계좌 정보 업데이트 (SSAFY API 값으로)
			account.updateAccountInfo(bankName, bankCode, realAccountHolderName);
			log.info("기존 계좌 정보 갱신: memberId={}, accountNo={}, realName={}, bankName={}",
				memberId, accountNo, realAccountHolderName, bankName);
		} else {
			// 새 계좌 생성 (SSAFY API 값으로)
			account = Account.builder()
				.member(member)
				.bankName(bankName)
				.bankCode(bankCode)
				.accountNo(authResult.getAccountNo())
				.accountHolderName(realAccountHolderName)
				.accountState(AccountState.ACTIVE)
				.build();

			// Member와 Account 연관관계 설정
			member.addAccount(account);

			// Account 저장
			accountRepository.save(account);

			log.info("1원 인증 완료 및 계좌 신규 등록: memberId={}, accountNo={}, realName={}, bankName={}",
				memberId, authResult.getAccountNo(), realAccountHolderName, bankName);
		}

		return AccountVerificationResponse.builder()
			.accountNo(authResult.getAccountNo())
			.realName(realAccountHolderName)
			.verified(true)
			.message("계좌 인증이 완료되었습니다.")
			.build();
	}

	/**
	 * 은행코드로 은행명 조회
	 *
	 * @param bankCode 은행코드 (3자리)
	 * @return 은행명
	 */
	private String getBankNameByCode(String bankCode) {
		return switch (bankCode) {
			case "001" -> "한국은행";
			case "002" -> "산업은행";
			case "003" -> "기업은행";
			case "004" -> "국민은행";
			case "005" -> "외환은행";
			case "007" -> "수협은행";
			case "008" -> "수출입은행";
			case "011" -> "농협은행";
			case "012" -> "농협회원조합";
			case "020" -> "우리은행";
			case "023" -> "SC제일은행";
			case "027" -> "한국씨티은행";
			case "031" -> "대구은행";
			case "032" -> "부산은행";
			case "034" -> "광주은행";
			case "035" -> "제주은행";
			case "037" -> "전북은행";
			case "039" -> "경남은행";
			case "045" -> "새마을금고";
			case "048" -> "신협";
			case "050" -> "상호저축은행";
			case "064" -> "산림조합";
			case "071" -> "우체국";
			case "081" -> "하나은행";
			case "088" -> "신한은행";
			case "089" -> "케이뱅크";
			case "090" -> "카카오뱅크";
			case "092" -> "토스뱅크";
			default -> "기타은행";
		};
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
	 * SSAFY 계좌의 특정 거래 내역 조회 (1원 인증 코드 확인용)
	 *
	 * @param memberId             회원 ID
	 * @param accountNo            계좌번호
	 * @param transactionUniqueNo  거래 고유번호
	 * @return 거래 내역 (인증 코드 포함)
	 */
	public SsafyTransactionResponse getTransactionHistory(Long memberId, String accountNo, String transactionUniqueNo) {
		Member member = findMemberById(memberId);

		if (member.getSsafyUserKey() == null) {
			log.error("SSAFY userKey가 없음: memberId={}", memberId);
			throw new BusinessException(ErrorCode.ACCOUNT_VERIFICATION_FAILED);
		}

		// SSAFY API 호출: 거래 내역 단건 조회
		InquireTransactionHistoryResponse.TransactionRec transactionRec = financeApiService.inquireTransactionHistory(
			accountNo,
			transactionUniqueNo,
			member.getSsafyUserKey()
		);

		log.info("거래 내역 조회 성공: memberId={}, accountNo={}, transactionUniqueNo={}, summary={}",
			memberId, accountNo, transactionUniqueNo, transactionRec.getTransactionSummary());

		return SsafyTransactionResponse.from(transactionRec);
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