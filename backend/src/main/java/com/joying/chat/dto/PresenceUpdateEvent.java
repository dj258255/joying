package com.joying.chat.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 접속 상태가 바뀐 것을 알리는 이벤트.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class PresenceUpdateEvent {

	private Long memberId;

	@JsonProperty("isOnline")
	private boolean isOnline;

	private Instant lastSeenAt;
}
