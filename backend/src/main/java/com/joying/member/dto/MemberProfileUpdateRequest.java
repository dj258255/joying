package com.joying.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원 프로필 수정 요청 DTO
 *
 * Note: 프로필 이미지 변경은 별도 API 사용
 * - PUT /api/v1/members/{memberId}/profile-image (업로드)
 * - DELETE /api/v1/members/{memberId}/profile-image (삭제)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "회원 프로필 수정 요청")
public class MemberProfileUpdateRequest {

	@Schema(description = "닉네임 (변경 시에만 입력)", example = "길동이", nullable = true)
	private String nickname;
}