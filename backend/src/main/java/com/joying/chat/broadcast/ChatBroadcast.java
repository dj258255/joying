package com.joying.chat.broadcast;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버를 넘어야 하는 전달 한 건.
 *
 * <p>로컬 브로커는 구독 정보를 자기 메모리에만 들고 있어서, 보낸 서버에 붙어 있지 않은
 * 상대에게는 닿지 않는다. 그래서 밖으로 나가야 하는 것은 전부 이 봉투에 담아 Redis로
 * 보내고, 각 서버가 받아서 자기에게 붙은 세션에만 내보낸다.
 *
 * <p>페이로드를 JSON 문자열로 들고 다니는 이유는, 봉투 하나로 여러 종류를 실어 나르면서
 * 받는 쪽이 타입 정보를 따로 설정하지 않아도 되게 하기 위해서다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChatBroadcast {

	public static final String CHANNEL = "chat:broadcast";

	/** 특정 회원에게 보낼 것인지, 목적지를 구독한 모두에게 보낼 것인지 */
	private Kind kind;

	/** {@link Kind#USER}일 때 받을 회원. 아니면 null */
	private Long userId;

	/** 브로커 목적지. 예: /queue/chatroom-update, /topic/chat/1/typing */
	private String destination;

	/** 실어 나르는 내용. 받는 쪽은 해석하지 않는다 */
	private String payloadJson;

	public enum Kind {
		/** 한 회원의 세션들에 보낸다 */
		USER,

		/** 목적지를 구독한 모두에게 보낸다 */
		TOPIC
	}
}
