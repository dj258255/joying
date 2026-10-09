package com.joying.chat.migration;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;
import com.joying.chat.metrics.ChatMetrics;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * 방 화면 목록 읽기를 어느 DB 가 받을지 정한다 (#120).
 *
 * <p>이중 쓰기(#105)는 삽입만 비추므로 읽음 · 수정 · 삭제 같은 가변 열은 새 DB 에서
 * 어긋난다. 어긋남이 0 이라는 것을 눈으로 보기 전에는 읽기를 돌릴 수 없고, 그 눈이
 * 섀도 리드다. 옛 DB 로 응답하면서 같은 조회를 새 DB 에 비동기로 날려 비교한다.
 * 대규모 이관들이 쓴 검증 방식이다(읽기 일부를 양쪽에 보내 결과를 비교).
 *
 * <p>모드 셋: old(기본) · shadow(옛 DB 응답 + 비교) · new(새 DB 응답).
 * 전환 범위는 방 화면 목록(첫 페이지 · before · after)뿐이다. 검색 · 단건 조회 ·
 * 수정 · 삭제는 쓰기 컷오버 전까지 옛 DB 에 남는다.
 *
 * <p>비교 작업은 전용 1스레드 + 유한 큐다. 공유 풀에 두면 몰린 조회가 집계 경합을
 * 다시 만든다(#116 에서 실측). 큐가 넘치면 그 비교는 버리고 버린 수를 센다. 섀도
 * 비교는 표본이라 버림이 허용되지만, 버렸다는 사실은 지표로 남아야 한다.
 */
@Component
public class ChatSplitReadRouter {

	private static final Logger log = LoggerFactory.getLogger(ChatSplitReadRouter.class);

	private static final String COLUMNS = """
		id, chat_room_id, sequence, sender_id, type, content, image_url, file_url,
		file_name, file_size, reply_to_message_id, client_message_id, created_at,
		updated_at, is_edited, original_content, is_deleted, is_read
		""";

	private static final RowMapper<ChatMessage> ROW_MAPPER = (rs, i) -> restore(rs);

	private final String mode;
	private final ChatMetrics chatMetrics;
	private final JdbcTemplate target;
	private final ThreadPoolExecutor comparePool;

	public ChatSplitReadRouter(ChatMetrics chatMetrics,
							   @Value("${joying.chat.read.mode:old}") String mode,
							   @Value("${joying.chat.migration.target.url:}") String targetUrl,
							   @Value("${joying.chat.migration.target.username:}") String targetUser,
							   @Value("${joying.chat.migration.target.password:}") String targetPassword) {
		this.chatMetrics = chatMetrics;
		this.mode = mode;
		if (shadow() || serveFromNew()) {
			if (targetUrl.isBlank()) {
				throw new IllegalStateException(
					"읽기 모드가 " + mode + " 인데 대상 DB 주소(joying.chat.migration.target.url)가 없습니다");
			}
			this.target = new JdbcTemplate(readDataSource(targetUrl, targetUser, targetPassword));
			this.comparePool = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
				new ArrayBlockingQueue<>(100),
				r -> new Thread(r, "chat-shadow-read"));
			log.info("메시지 읽기 모드 {}: target={}", mode, targetUrl);
		} else {
			this.target = null;
			this.comparePool = null;
		}
	}

	private DataSource readDataSource(String url, String user, String password) {
		HikariConfig config = new HikariConfig();
		config.setJdbcUrl(url);
		config.setUsername(user);
		config.setPassword(password);
		// 읽기 경로가 쓰는 풀이다. 섀도 비교는 1스레드라 1개면 되지만, new 모드는
		// 화면 조회가 전부 지나므로 조회 동시성만큼 둔다
		config.setMaximumPoolSize(serveFromNew() ? 10 : 2);
		config.setConnectionTimeout(1000);
		config.setPoolName("chat-split-read");
		return new HikariDataSource(config);
	}

	public boolean serveFromNew() {
		return "new".equals(mode);
	}

	public boolean shadow() {
		return "shadow".equals(mode);
	}

	public List<ChatMessage> firstPage(Long chatRoomId, int size) {
		return target.query("SELECT " + COLUMNS + " FROM chat_message "
				+ "WHERE chat_room_id = ? AND is_deleted = false "
				+ "ORDER BY sequence DESC LIMIT ?",
			ROW_MAPPER, chatRoomId, size);
	}

	public List<ChatMessage> before(Long chatRoomId, Long cursor, int size) {
		return target.query("SELECT " + COLUMNS + " FROM chat_message "
				+ "WHERE chat_room_id = ? AND is_deleted = false AND sequence < ? "
				+ "ORDER BY sequence DESC LIMIT ?",
			ROW_MAPPER, chatRoomId, cursor, size);
	}

	public List<ChatMessage> after(Long chatRoomId, Long cursor, int size) {
		return target.query("SELECT " + COLUMNS + " FROM chat_message "
				+ "WHERE chat_room_id = ? AND is_deleted = false AND sequence > ? "
				+ "ORDER BY sequence ASC LIMIT ?",
			ROW_MAPPER, chatRoomId, cursor, size);
	}

	/**
	 * 옛 DB 가 응답한 결과와 같은 조회의 새 DB 결과를 비동기로 비교한다.
	 * shadow 모드가 아니면 아무 일도 하지 않는다.
	 */
	public void compareAsync(String what, Long chatRoomId,
							 List<ChatMessage> served, Supplier<List<ChatMessage>> newRead) {
		if (!shadow()) {
			return;
		}
		String servedSignature = signature(served);
		try {
			comparePool.execute(() -> {
				try {
					String newSignature = signature(newRead.get());
					chatMetrics.shadowCompared();
					if (!servedSignature.equals(newSignature)) {
						chatMetrics.shadowMismatch();
						log.warn("섀도 리드 불일치: what={}, chatRoomId={}, old={}, new={}",
							what, chatRoomId, head(servedSignature), head(newSignature));
					}
				} catch (Exception e) {
					// 비교 실패는 불일치가 아니라 모름이다. 따로 센다
					chatMetrics.shadowError();
					log.error("섀도 리드 비교 실패: what={}, chatRoomId={}, error={}",
						what, chatRoomId, e.getMessage());
				}
			});
		} catch (RejectedExecutionException e) {
			chatMetrics.shadowDropped();
		}
	}

	/**
	 * 결과의 비교 서명. 순서까지 포함해, 행이 끼거나 빠지거나 가변 열이 다르면
	 * 서명이 달라진다.
	 */
	private String signature(List<ChatMessage> messages) {
		StringBuilder sb = new StringBuilder();
		for (ChatMessage m : messages) {
			sb.append(m.getId()).append('|').append(m.getSequence()).append('|')
				.append(m.getContent() == null ? 0 : m.getContent().hashCode()).append('|')
				.append(m.isEdited()).append('|').append(m.isRead()).append(';');
		}
		return sb.toString();
	}

	private String head(String signature) {
		return signature.length() > 120 ? signature.substring(0, 120) + "..." : signature;
	}

	private static ChatMessage restore(ResultSet rs) throws SQLException {
		return ChatMessage.restore(
			rs.getString("id"), rs.getLong("chat_room_id"),
			(Long) rs.getObject("sequence"), rs.getLong("sender_id"),
			MessageType.valueOf(rs.getString("type")), rs.getString("content"),
			rs.getString("image_url"), rs.getString("file_url"), rs.getString("file_name"),
			(Long) rs.getObject("file_size"), rs.getString("reply_to_message_id"),
			rs.getString("client_message_id"),
			instant(rs, "created_at"), instant(rs, "updated_at"),
			rs.getBoolean("is_edited"), rs.getString("original_content"),
			rs.getBoolean("is_deleted"), rs.getBoolean("is_read"));
	}

	private static Instant instant(ResultSet rs, String column) throws SQLException {
		java.sql.Timestamp ts = rs.getTimestamp(column);
		return ts == null ? null : ts.toInstant();
	}
}
