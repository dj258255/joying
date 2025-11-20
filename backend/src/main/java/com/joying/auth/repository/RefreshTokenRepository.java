package com.joying.auth.repository;

import com.joying.auth.domain.RefreshToken;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * RefreshToken Repository (Redis 기반)
 */
@Repository
public interface RefreshTokenRepository extends CrudRepository<RefreshToken, String> {

	/**
	 * 회원 ID로 Refresh Token 조회
	 *
	 * @param memberId 회원 ID
	 * @return RefreshToken (Optional)
	 */
	Optional<RefreshToken> findByMemberId(Long memberId);

	/**
	 * 회원 ID로 Refresh Token 삭제
	 *
	 * @param memberId 회원 ID
	 */
	void deleteByMemberId(Long memberId);

	/**
	 * 회원 ID로 Refresh Token 존재 여부 확인
	 *
	 * @param memberId 회원 ID
	 * @return 존재 여부
	 */
	boolean existsByMemberId(Long memberId);
}