package com.joying.chat.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 참여자 정보.
 *
 * <p>상대방 정보와 온라인 상태, 그리고 내 채팅방 설정을 함께 담는다.
 *
 * <p>{@code isOnline} 같은 필드에 {@link JsonProperty}를 붙인 이유는, 이름을 그대로
 * 내보내기 위해서다. 붙이지 않으면 Jackson이 {@code is}를 떼고 {@code online}으로
 * 내보내는데, 화면은 {@code isOnline}을 읽는다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomMemberResponse {

	private Long memberId;
	private String nickname;
	private String profileUrl;

	@JsonProperty("isOnline")
	private boolean isOnline;

	private Instant lastSeenAt;

	@JsonProperty("isPinned")
	private boolean isPinned;

	@JsonProperty("isMuted")
	private boolean isMuted;

	private Instant lastReadAt;

	private Long chatRoomId;
	private Long productId;
	private String productTitle;
}
