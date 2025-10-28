package com.joying.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원 프로필 수정 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "회원 프로필 수정 요청")
public class MemberProfileUpdateRequest {

	@Schema(description = "닉네임 (변경 시에만 입력)", example = "길동이", nullable = true)
	private String nickname;

	@Schema(description = "프로필 이미지 ID (변경 시에만 입력)", example = "1", nullable = true)
	private Long profileImageId;
}