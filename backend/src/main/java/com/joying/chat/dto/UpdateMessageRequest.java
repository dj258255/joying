package com.joying.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 메시지 수정 요청.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMessageRequest {

	@NotBlank(message = "메시지 내용은 필수입니다")
	@Size(max = 5000, message = "메시지는 5000자를 초과할 수 없습니다")
	private String content;
}
