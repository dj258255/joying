package com.joying.chat.dto;

import java.time.Instant;

import com.joying.chat.domain.ChatRoomStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 상태가 바뀐 것을 상대방에게 알리는 이벤트.
 *
 * <p>나가기, 재입장, 자동 종료가 여기로 나간다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomStatusEvent {

	private Long chatRoomId;
	private EventType eventType;

	/** 이벤트를 발생시킨 사용자 */
	private Long memberId;

	private String memberNickname;

	/** 자동 종료처럼 방 상태가 함께 바뀌는 경우에만 채운다 */
	private ChatRoomStatus status;

	@Builder.Default
	private Instant timestamp = Instant.now();

	public enum EventType {
		/** 상대방이 나갔다 */
		MEMBER_LEFT,

		/** 상대방이 다시 들어왔다 */
		MEMBER_REJOINED,

		/** 채팅방이 자동으로 종료됐다 */
		ROOM_CLOSED
	}
}
