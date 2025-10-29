package com.joying.member.dto;

import com.joying.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원 정보 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "회원 정보 응답")
public class MemberResponse {

	private static final String DEFAULT_PROFILE_IMAGE = "/images/default_profile_image.png";

	@Schema(description = "회원 ID", example = "1")
	private Long memberId;

	@Schema(description = "닉네임 (Kakao 별명)", example = "길동이")
	private String nickname;

	@Schema(description = "실명 (1원 인증으로 확인된 이름)", example = "홍길동", nullable = true)
	private String name;

	@Schema(description = "이메일", example = "user@example.com")
	private String email;

	@Schema(description = "프로필 이미지 ID", example = "1")
	private Long profileImageId;

	@Schema(description = "프로필 이미지 URL", example = "/images/default_profile_image.png")
	private String profileImageUrl;

	@Schema(description = "평점", example = "4.5")
	private Double rating;

	@Schema(description = "1원 인증 완료 여부", example = "false")
	private Boolean verified;

	/**
	 * Member 엔티티를 MemberResponse로 변환
	 *
	 * @param member Member 엔티티
	 * @return MemberResponse
	 */
	public static MemberResponse from(Member member) {
		return MemberResponse.builder()
			.memberId(member.getMemberId())
			.nickname(member.getNickname())
			.name(member.getName()) // 1원 인증 전이면 null
			.email(member.getEmail())
			.profileImageId(member.getProfileImage() != null ? member.getProfileImage().getFileId() : null)
			.profileImageUrl(buildProfileImageUrl(member))
			.rating(member.getRating())
			.verified(member.getName() != null) // 실명이 있으면 인증 완료
			.build();
	}

	/**
	 * 프로필 이미지 URL 생성
	 * - profileImage가 null이면 기본 이미지 반환
	 * - profileImage가 있으면 File 경로 반환
	 */
	private static String buildProfileImageUrl(Member member) {
		if (member.getProfileImage() == null) {
			return DEFAULT_PROFILE_IMAGE;
		}
		// File 엔티티에서 URL 구성
		// 예: /files/{directory}/{fileName}
		return String.format("/files/%s/%s",
			member.getProfileImage().getDirectory(),
			member.getProfileImage().getFileName());
	}
}