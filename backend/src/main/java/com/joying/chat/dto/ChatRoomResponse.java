package com.joying.chat.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.joying.chat.domain.ChatRoomStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 응답.
 *
 * <p>목록과 상세가 같은 모양을 쓴다. 목록에서는 {@code member}가 비어 있고,
 * 상세에서만 채워진다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {

	private Long chatRoomId;
	private Long productId;
	private String productTitle;
	private String productImageUrl;
	private Long otherMemberId;
	private String otherMemberNickname;
	private String otherMemberProfileUrl;
	private String lastMessage;
	private Instant lastMessageAt;
	private long unreadCount;
	private ChatRoomStatus status;

	@JsonProperty("isPinned")
	private boolean isPinned;

	@JsonProperty("isMuted")
	private boolean isMuted;

	/** 내가 나간 방인지 */
	@JsonProperty("isLeft")
	private boolean isLeft;

	/** 상세 조회일 때만 채운다 */
	private MemberInfo member;

	/**
	 * 상대방의 접속 상태.
	 */
	@Getter
	@Builder(toBuilder = true)
	@NoArgsConstructor
	@AllArgsConstructor
	public static class MemberInfo {

		@JsonProperty("isOnline")
		private boolean isOnline;

		private Instant lastSeenAt;
	}
}
