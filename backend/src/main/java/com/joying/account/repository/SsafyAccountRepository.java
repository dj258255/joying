package com.joying.account.repository;

import com.joying.account.domain.SsafyAccount;
import com.joying.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * SSAFY Account Repository
 */
@Repository
public interface SsafyAccountRepository extends JpaRepository<SsafyAccount, Long> {

	/**
	 * 특정 회원의 모든 SSAFY 계좌 조회
	 *
	 * @param member 회원
	 * @return SSAFY 계좌 목록
	 */
	List<SsafyAccount> findByMember(Member member);

	/**
	 * 특정 회원 ID로 모든 SSAFY 계좌 조회
	 *
	 * @param memberId 회원 ID
	 * @return SSAFY 계좌 목록
	 */
	List<SsafyAccount> findByMember_MemberId(Long memberId);

	/**
	 * 계좌번호로 SSAFY 계좌 존재 여부 확인
	 *
	 * @param accountNo 계좌번호 (16자리)
	 * @return 존재 여부
	 */
	boolean existsByAccountNo(String accountNo);

	/**
	 * 계좌번호로 SSAFY 계좌 조회
	 *
	 * @param accountNo 계좌번호
	 * @return SSAFY 계좌
	 */
	Optional<SsafyAccount> findByAccountNo(String accountNo);

	/**
	 * 회원과 계좌번호로 SSAFY 계좌 조회
	 *
	 * @param member 회원
	 * @param accountNo 계좌번호
	 * @return SSAFY 계좌
	 */
	Optional<SsafyAccount> findByMemberAndAccountNo(Member member, String accountNo);
}