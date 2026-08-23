package com.joying.chat.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 채팅 메시지의 조건부 인덱스를 만든다.
 *
 * <p>같은 전송을 한 번만 저장하려면 방과 전송 식별자에 유니크가 필요하다. 그런데
 * 식별자가 없는 메시지도 있다. 화면이 그 값을 붙이기 전에 만들어진 것들이다.
 *
 * <p>조건 없이 유니크를 걸면 식별자가 빈 두 건이 서로 부딪힌다. 값이 있을 때만 제약을
 * 걸어야 한다. JPA 의 {@code @UniqueConstraint} 로는 조건을 붙일 수 없어 여기서 만든다.
 *
 * <p>문서 저장소를 쓰던 때 같은 문제를 겪었다. 그때는 {@code sparse} 를 썼는데,
 * 그것은 인덱스 키 중 하나라도 값이 있으면 색인하므로 방 번호만 있어도 문서가 들어가
 * 식별자 없는 두 건이 부딪혔다. 조건부 인덱스로 바꿔야 했다. 저장소는 바뀌었지만
 * 필요한 것은 같다.
 *
 * <p>읽는 경로가 쓰는 인덱스는 엔티티에 적어 두었다. 조건이 필요 없어 스키마 생성이
 * 만들어 준다.
 */
@Component
public class ChatMessageIndexInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ChatMessageIndexInitializer.class);

	private static final String CREATE_CLIENT_MESSAGE_ID_INDEX = """
		CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_message_client_id
		ON chat_message (chat_room_id, client_message_id)
		WHERE client_message_id IS NOT NULL
		""";

	private final JdbcTemplate jdbcTemplate;

	public ChatMessageIndexInitializer(DataSource dataSource) {
		this.jdbcTemplate = new JdbcTemplate(dataSource);
	}

	@Override
	public void run(ApplicationArguments args) {
		try {
			jdbcTemplate.execute(CREATE_CLIENT_MESSAGE_ID_INDEX);
			log.info("채팅 메시지 조건부 유니크 인덱스 확인 완료: uk_chat_message_client_id");
		} catch (Exception e) {
			// 이미 어긋난 데이터가 있으면 만들어지지 않는다. 기동을 막지는 않는다.
			// 막으면 배포가 통째로 서는데, 이 제약이 없어도 조회로 한 겹은 걸러진다.
			log.error("채팅 메시지 조건부 유니크 인덱스를 만들지 못했다. "
					+ "같은 전송이 두 건으로 저장될 수 있다: {}", e.getMessage());
		}
	}
}
