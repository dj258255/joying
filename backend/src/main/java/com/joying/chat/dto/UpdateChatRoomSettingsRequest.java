package com.joying.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 채팅방 설정 변경 요청.
 *
 * <p>둘 다 비어 있을 수 있다. 보낸 것만 바꾼다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChatRoomSettingsRequest {

	@JsonProperty("isPinned")
	private Boolean isPinned;

	@JsonProperty("isMuted")
	private Boolean isMuted;
}
