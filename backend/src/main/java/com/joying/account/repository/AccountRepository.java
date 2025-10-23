package com.joying.account.repository;

import com.joying.account.domain.Account;
import com.joying.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Account Repository
 */
@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

	/**
	 * 특정 회원의 모든 계좌 조회
	 *
	 * @param member 회원
	 * @return 계좌 목록
	 */
	List<Account> findByMember(Member member);

	/**
	 * 특정 회원 ID로 모든 계좌 조회
	 *
	 * @param memberId 회원 ID
	 * @return 계좌 목록
	 */
	List<Account> findByMember_MemberId(Long memberId);

	/**
	 * 핀테크 이용번호로 계좌 조회
	 *
	 * @param fintechUseNum 핀테크 이용번호
	 * @return 계좌 (Optional)
	 */
	Optional<Account> findByFintechUseNum(String fintechUseNum);

	/**
	 * 핀테크 이용번호 존재 여부 확인
	 *
	 * @param fintechUseNum 핀테크 이용번호
	 * @return 존재 여부
	 */
	boolean existsByFintechUseNum(String fintechUseNum);

	/**
	 * 계좌번호로 계좌 존재 여부 확인
	 *
	 * @param accountNum 계좌번호
	 * @return 존재 여부
	 */
	boolean existsByAccountNum(String accountNum);
}