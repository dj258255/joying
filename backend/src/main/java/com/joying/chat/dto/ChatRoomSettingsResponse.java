package com.joying.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 설정.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomSettingsResponse {

	@JsonProperty("isPinned")
	private boolean isPinned;

	@JsonProperty("isMuted")
	private boolean isMuted;
}
