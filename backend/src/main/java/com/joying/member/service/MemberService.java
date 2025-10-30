package com.joying.member.service;

import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import com.joying.file.service.FileService;
import com.joying.member.domain.Member;
import com.joying.member.dto.MemberProfileUpdateRequest;
import com.joying.member.dto.MemberResponse;
import com.joying.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 회원 서비스
 *
 * 회원 정보 조회, 수정, 탈퇴 등의 비즈니스 로직 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

	private final MemberRepository memberRepository;
	private final FileService fileService;
	private final FileRepository fileRepository;
	private final FileUrlResolver fileUrlResolver;

	/**
	 * 회원 정보 조회
	 *
	 * @param memberId 회원 ID
	 * @return 회원 정보
	 */
	public MemberResponse getMemberInfo(Long memberId) {
		Member member = findMemberById(memberId);
		return MemberResponse.from(member, fileUrlResolver);
	}

	/**
	 * 회원 프로필 수정 (본인만 가능)
	 *
	 * @param memberId        수정할 회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID (토큰에서 추출)
	 * @param request         프로필 수정 요청 (닉네임만 수정)
	 * @return 수정된 회원 정보
	 *
	 * Note: 프로필 이미지 변경은 별도 API 사용
	 * - uploadProfileImage() : 이미지 업로드
	 * - deleteProfileImage() : 이미지 삭제
	 */
	@Transactional
	public MemberResponse updateProfile(Long memberId, Long currentMemberId, MemberProfileUpdateRequest request) {
		// 권한 검증: 본인만 수정 가능
		validateOwnership(memberId, currentMemberId);

		Member member = findMemberById(memberId);

		// 닉네임 수정
		// Note: 실명(name)은 1원 인증을 통해서만 업데이트 가능
		// Note: 프로필 이미지는 별도 API로 변경
		member.updateProfile(request.getNickname(), null);

		log.info("회원 프로필 수정 완료: memberId={}, nickname={}",
			memberId, request.getNickname());

		return MemberResponse.from(member, fileUrlResolver);
	}

	/**
	 * 프로필 이미지 업로드 (본인만 가능)
	 *
	 * @param memberId        회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID (토큰에서 추출)
	 * @param multipartFile   업로드할 이미지 파일
	 * @return 수정된 회원 정보
	 */
	@Transactional
	public MemberResponse uploadProfileImage(Long memberId, Long currentMemberId, MultipartFile multipartFile) {
		// 권한 검증: 본인만 수정 가능
		validateOwnership(memberId, currentMemberId);

		Member member = findMemberById(memberId);

		// FileService를 통해 파일 업로드
		File uploadedFile = fileService.saveFile(multipartFile);

		// 회원 프로필 이미지 변경
		member.updateProfile(null, uploadedFile);

		log.info("프로필 이미지 업로드 완료: memberId={}, fileId={}", memberId, uploadedFile.getFileId());

		return MemberResponse.from(member, fileUrlResolver);
	}

	/**
	 * 프로필 이미지 완전 삭제 (본인만 가능)
	 * - 사용자 업로드 이미지 삭제
	 * - 카카오 프로필 이미지 URL 삭제
	 * → 기본 이미지로 완전 복원
	 *
	 * @param memberId        회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID (토큰에서 추출)
	 * @return 수정된 회원 정보 (기본 이미지 적용)
	 */
	@Transactional
	public MemberResponse deleteProfileImage(Long memberId, Long currentMemberId) {
		// 권한 검증: 본인만 수정 가능
		validateOwnership(memberId, currentMemberId);

		Member member = findMemberById(memberId);

		// 프로필 이미지 완전 삭제
		// - profileImage (File FK) → null
		// - kakaoProfileImageUrl (String) → null
		// → 기본 이미지 경로만 반환됨
		member.deleteProfileImage();

		log.info("프로필 이미지 완전 삭제 완료: memberId={}", memberId);

		return MemberResponse.from(member, fileUrlResolver);
	}

	/**
	 * 회원 탈퇴 (본인만 가능)
	 *
	 * @param memberId        탈퇴할 회원 ID
	 * @param currentMemberId 현재 로그인한 회원 ID (토큰에서 추출)
	 */
	@Transactional
	public void deleteMember(Long memberId, Long currentMemberId) {
		// 권한 검증: 본인만 탈퇴 가능
		validateOwnership(memberId, currentMemberId);

		Member member = findMemberById(memberId);

		memberRepository.delete(member);

		log.info("회원 탈퇴 완료: memberId={}", memberId);
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
	 * 소유권 검증 (본인 확인)
	 * URL의 memberId와 토큰의 currentMemberId가 일치하는지 검증
	 *
	 * @param targetMemberId  대상 회원 ID (URL 경로에서 추출)
	 * @param currentMemberId 현재 로그인한 회원 ID (JWT 토큰에서 추출)
	 * @throws BusinessException MEMBER_NOT_OWNER - 본인이 아닌 경우
	 */
	private void validateOwnership(Long targetMemberId, Long currentMemberId) {
		if (!targetMemberId.equals(currentMemberId)) {
			log.warn("권한 없음: targetMemberId={}, currentMemberId={}", targetMemberId, currentMemberId);
			throw new BusinessException(ErrorCode.MEMBER_NOT_OWNER);
		}
	}
}