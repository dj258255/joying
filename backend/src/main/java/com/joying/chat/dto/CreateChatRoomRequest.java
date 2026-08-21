package com.joying.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 채팅방 생성 요청.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateChatRoomRequest {

	@NotNull(message = "상품 ID는 필수입니다")
	private Long productId;
}
