package com.joying.chat.domain;

/**
 * 채팅방 상태.
 */
public enum ChatRoomStatus {
	/** 정상. 대화할 수 있다 */
	ACTIVE,

	/** 사람이 닫았다 */
	CLOSED,

	/** 오래 안 써서 자동으로 닫혔다 */
	AUTO_CLOSED
}
