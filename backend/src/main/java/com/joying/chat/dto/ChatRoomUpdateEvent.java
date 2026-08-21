package com.joying.chat.dto;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 목록을 실시간으로 갱신하는 이벤트.
 *
 * <p>메시지를 보내면 받는 쪽 목록의 마지막 메시지와 안읽음 개수가 바뀌어야 한다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomUpdateEvent {

	private Long chatRoomId;
	private String lastMessage;
	private Instant lastMessageAt;
	private long unreadCount;
}
