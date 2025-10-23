package com.joying.member.repository;

import com.joying.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Member Repository (Kakao OAuth 전용)
 */
@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {

	/**
	 * 이메일로 회원 조회 (Kakao OAuth 식별자)
	 *
	 * @param email 이메일
	 * @return 회원 (Optional)
	 */
	Optional<Member> findByEmail(String email);

	/**
	 * 이메일 존재 여부 확인
	 *
	 * @param email 이메일
	 * @return 존재 여부
	 */
	boolean existsByEmail(String email);
}