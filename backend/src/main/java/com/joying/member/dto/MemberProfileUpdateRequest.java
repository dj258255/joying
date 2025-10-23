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

	@NotBlank(message = "이름은 필수입니다.")
	@Schema(description = "이름", example = "홍길동")
	private String name;
}