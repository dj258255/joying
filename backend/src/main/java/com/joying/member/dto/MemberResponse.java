package com.joying.member.dto;

import com.joying.file.component.FileUrlResolver;
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

	@Schema(description = "프로필 이미지 ID", example = "1", nullable = true)
	private Long profileImageId;

	@Schema(description = "프로필 이미지 URL", example = "https://pub-ae135e3bc46443e1aae3c0bae55f45cc.r2.dev/uploads/2025-01-01/uuid_filename.jpg")
	private String profileImageUrl;

	@Schema(description = "평점", example = "4.5")
	private Double rating;

	@Schema(description = "1원 인증 완료 여부", example = "false")
	private Boolean verified;

	/**
	 * Member 엔티티를 MemberResponse로 변환
	 *
	 * @param member          Member 엔티티
	 * @param fileUrlResolver FileUrlResolver (File 엔티티를 Public URL로 변환)
	 * @return MemberResponse
	 */
	public static MemberResponse from(Member member, FileUrlResolver fileUrlResolver) {
		return MemberResponse.builder()
			.memberId(member.getMemberId())
			.nickname(member.getNickname())
			.name(member.getName()) // 1원 인증 전이면 null
			.email(member.getEmail())
			.profileImageId(member.getProfileImage() != null ? member.getProfileImage().getFileId() : null)
			.profileImageUrl(buildProfileImageUrl(member, fileUrlResolver))
			.rating(member.getRating())
			.verified(member.getName() != null) // 실명이 있으면 인증 완료
			.build();
	}

	/**
	 * 프로필 이미지 URL 생성 (우선순위 적용)
	 * 1순위: 사용자가 직접 업로드한 이미지 (profileImage File FK) → R2 Public URL
	 * 2순위: 카카오 프로필 이미지 URL (kakaoProfileImageUrl) → 카카오 URL
	 * 3순위: 기본 프로필 이미지 → /images/default_profile_image.png
	 */
	private static String buildProfileImageUrl(Member member, FileUrlResolver fileUrlResolver) {
		// 1순위: 사용자가 직접 업로드한 이미지
		if (member.getProfileImage() != null) {
			String publicUrl = fileUrlResolver.toPublicUrl(member.getProfileImage());
			if (publicUrl != null) {
				return publicUrl;
			}
		}

		// 2순위: 카카오 프로필 이미지 URL
		if (member.getKakaoProfileImageUrl() != null && !member.getKakaoProfileImageUrl().isEmpty()) {
			return member.getKakaoProfileImageUrl();
		}

		// 3순위: 기본 프로필 이미지
		return DEFAULT_PROFILE_IMAGE;
	}
}