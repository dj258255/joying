package com.joying.chat.migration;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.metrics.ChatMetrics;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * 메시지 저장소를 쓰기 중단 없이 전용 DB 로 분리하기 위한 이중 쓰기와 배리어 (#105).
 *
 * <p>구조는 공개된 플레이북(이중 쓰기 → 백필 → 검증 → 컷오버)을 따른다. 여기는 그중
 * 앱이 맡아야 하는 두 조각만 둔다. 새 메시지를 두 곳에 쓰는 것과, 컷오버 순간 마지막
 * 불일치를 0으로 만들기 위한 짧은 쓰기 배리어다. 과거 데이터를 옮기는 백필과 검증은
 * 앱 밖 도구가 한다(scripts/backfill-chat-messages.sh, verify-chat-split.sh).
 * 옮기는 속도는 라이브 전달과 자원을 다투므로 앱의 생명주기와 분리해 따로 조절해야 한다.
 *
 * <p>이중 쓰기는 동기다. 비동기로 하면 송신 지연은 안 늘지만 실패가 조용해진다.
 * 조용한 실패는 거짓 성공의 모양이라 피했고, 가산되는 지연은 측정으로 확인한다.
 * 다만 새 DB 쓰기 실패가 송신까지 막지는 않는다. 분리가 끝나기 전까지 정본은 옛
 * DB 이고, 새 DB 의 구멍은 검증이 잡아 백필이 메우기 때문이다. 실패는 지표로 센다.
 *
 * <p>정본 교대(#123)가 더해졌다. 모드는 런타임 상태이고 배리어 아래에서만 바꾼다.
 *
 * <ul>
 *   <li>dual-write: 정본은 옛 DB(JPA 저장). 새 DB 는 미러를 받는다.
 *   <li>new-primary: 정본은 새 DB({@link #insertPrimary}, 멱등 중재까지 새 DB 의
 *       조건부 유니크가 맡는다). 옛 DB 는 역방향 미러를 받아 전체 행을 계속 가진다.
 *       되돌림이 모드 복귀로 끝나고, 옛 DB 를 보는 나머지 읽기(검색 · 단건 · 답장
 *       원본)도 그대로 산다.
 * </ul>
 *
 * <p>기본값은 꺼짐이다. joying.chat.migration.mode=dual-write 로 켠다.
 */
@Component
public class ChatStorageMigration {

	private static final Logger log = LoggerFactory.getLogger(ChatStorageMigration.class);

	/** 배리어에서 송신이 기다릴 상한. 넘으면 그냥 진행한다. 송신을 영영 막는 것보다
	 * 배리어 실패(잔여 불일치)를 검증이 잡는 쪽이 낫다. */
	private static final long BARRIER_WAIT_MAX_MS = 5000;

	private static final String INSERT_COLUMNS = """
		INSERT INTO chat_message
		  (id, chat_room_id, sequence, sender_id, type, content,
		   image_url, file_url, file_name, file_size, reply_to_message_id,
		   client_message_id, created_at, updated_at, is_edited,
		   original_content, is_deleted, is_read)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		""";

	private static final String UPSERT = INSERT_COLUMNS + "ON CONFLICT (id) DO NOTHING";

	/** 정본 삽입. id 충돌을 숨기면 안 되므로 ON CONFLICT 가 없다 */
	private static final String INSERT_PLAIN = INSERT_COLUMNS;

	/** 정본 삽입 + 멱등 중재. 같은 전송이 먼저 들어와 있으면 0행이 돌아온다 */
	private static final String INSERT_IDEMPOTENT = INSERT_COLUMNS
		+ "ON CONFLICT (chat_room_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING";

	private final AtomicReference<String> mode;
	private final ChatMetrics chatMetrics;
	private final JdbcTemplate target;
	private final JdbcTemplate source;
	private final AtomicReference<CountDownLatch> barrier = new AtomicReference<>();
	private final AtomicLong mirrored = new AtomicLong();
	private final AtomicLong mirrorFailures = new AtomicLong();

	public ChatStorageMigration(ChatMetrics chatMetrics,
								DataSource appDataSource,
								@Value("${joying.chat.migration.mode:off}") String mode,
								@Value("${joying.chat.migration.target.url:}") String targetUrl,
								@Value("${joying.chat.migration.target.username:}") String targetUser,
								@Value("${joying.chat.migration.target.password:}") String targetPassword) {
		this.chatMetrics = chatMetrics;
		this.mode = new AtomicReference<>(mode);
		this.source = new JdbcTemplate(appDataSource);
		if (!"off".equals(mode) && targetUrl.isBlank()) {
			throw new IllegalStateException(
				"이관 모드가 " + mode + " 인데 대상 DB 주소(joying.chat.migration.target.url)가 없습니다");
		}
		if (!targetUrl.isBlank()) {
			this.target = new JdbcTemplate(targetDataSource(targetUrl, targetUser, targetPassword));
			log.info("메시지 이관 모드 {}: target={}", mode, targetUrl);
		} else {
			this.target = null;
		}
	}

	private DataSource targetDataSource(String url, String user, String password) {
		HikariConfig config = new HikariConfig();
		config.setJdbcUrl(url);
		config.setUsername(user);
		config.setPassword(password);
		// 송신 경로에서 동기로 쓰므로 풀이 마르면 송신이 기다린다. 넉넉히 두되
		// 커넥션 확보 대기는 짧게 끊어 실패로 세는 쪽을 고른다
		config.setMaximumPoolSize(10);
		config.setConnectionTimeout(1000);
		config.setPoolName("chat-migration-target");
		return new HikariDataSource(config);
	}

	public boolean dualWrite() {
		return "dual-write".equals(mode.get());
	}

	public boolean newPrimary() {
		return "new-primary".equals(mode.get());
	}

	private boolean mirroring() {
		return dualWrite() || newPrimary();
	}

	/**
	 * 정본을 바꾼다 (#123). 배리어가 서 있을 때만 받는다.
	 *
	 * <p>모드는 노드마다 따로 사는 메모리 상태라 두 노드가 잠깐 다른 모드일 수 있다.
	 * 그 창에 새 저장이 있으면 멱등 중재의 심판이 둘로 갈라진다. 배리어 아래에서만
	 * 바꾸면 그 창에 저장이 없다.
	 */
	public void setMode(String next) {
		if (!"dual-write".equals(next) && !"new-primary".equals(next)) {
			throw new IllegalArgumentException("모드는 dual-write 또는 new-primary 만 된다: " + next);
		}
		String current = mode.get();
		if (current.equals(next)) {
			return;
		}
		if ("off".equals(current)) {
			throw new IllegalStateException("off 에서는 전환할 수 없다. 이중 쓰기부터 거친다");
		}
		if (!barrierUp()) {
			throw new IllegalStateException("정본 교대는 쓰기 배리어 아래에서만 한다");
		}
		mode.set(next);
		log.info("메시지 정본을 바꾼다: {} -> {}", current, next);
	}

	/**
	 * 저장이 끝난 메시지를 정본이 아닌 쪽에도 쓴다. 같은 id 가 이미 있으면(백필과
	 * 겹침) 그대로 둔다. 백필과 미러가 같은 행을 서로 다른 순서로 넣어도 최종 상태가
	 * 같다.
	 *
	 * <p>dual-write 면 새 DB 로, new-primary 면 옛 DB 로 간다. 역방향 미러가 옛 DB 를
	 * 계속 채우므로 되돌림이 모드 복귀로 끝나고, 옛 DB 를 보는 읽기도 그대로 산다.
	 */
	public void mirror(ChatMessage m) {
		if (dualWrite()) {
			upsert(target, "이중 쓰기", m);
		} else if (newPrimary()) {
			upsert(source, "역방향 미러", m);
		}
	}

	/**
	 * 시스템 메시지처럼 JPA(옛 DB)로 저장되는 행을 새 DB 에도 쓴다.
	 *
	 * <p>송신 경로와 달리 이 행들은 정본 교대 뒤에도 옛 DB 먼저 저장된다. 멱등
	 * 식별자가 없어 중재가 필요 없고, 호출 자리를 바꾸는 것보다 양쪽 쓰기를 유지하는
	 * 쪽이 작다. 새 DB 실패는 미러 실패로 세고 백필 · 재동기화가 메운다.
	 */
	public void mirrorToNew(ChatMessage m) {
		if (mirroring()) {
			upsert(target, "새 DB 미러", m);
		}
	}

	private void upsert(JdbcTemplate db, String what, ChatMessage m) {
		long started = System.nanoTime();
		try {
			db.update(UPSERT, insertParams(m));
			mirrored.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, true);
		} catch (RuntimeException e) {
			// 송신은 막지 않는다. 정본이 아닌 쪽의 구멍은 검증이 잡는다.
			// 다만 조용히 지나가면 안 되므로 세고 남긴다
			mirrorFailures.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, false);
			log.warn("{} 실패: messageId={}, error={}", what, m.getId(), e.getMessage());
		}
	}

	private Object[] insertParams(ChatMessage m) {
		return new Object[] {
			m.getId(), m.getChatRoomId(), m.getSequence(), m.getSenderId(),
			m.getType() == null ? null : m.getType().name(), m.getContent(),
			m.getImageUrl(), m.getFileUrl(), m.getFileName(), m.getFileSize(),
			m.getReplyToMessageId(), m.getClientMessageId(),
			m.getCreatedAt() == null ? null : java.sql.Timestamp.from(m.getCreatedAt()),
			m.getUpdatedAt() == null ? null : java.sql.Timestamp.from(m.getUpdatedAt()),
			m.isEdited(), m.getOriginalContent(), m.isDeleted(), m.isRead()
		};
	}

	/**
	 * new-primary 의 정본 저장 (#123). 새 DB 에 넣고, 넣었으면 true 를 돌려준다.
	 *
	 * <p>같은 전송을 한 번만 저장하는 심판도 여기로 옮겨 온다. 새 DB 의 조건부 유니크
	 * (uk_chat_message_client_id)에 걸리면 0행이고, 그때 호출자는 먼저 넣은 행을
	 * 읽어 멱등 히트로 처리한다. 전송 식별자가 없으면 중재 없이 그냥 넣는다.
	 *
	 * <p>여기 실패는 미러와 달리 송신 실패다. 정본에 못 넣은 메시지를 보냈다고 하면
	 * 거짓 성공이라 예외를 그대로 올린다.
	 */
	public boolean insertPrimary(ChatMessage m) {
		if (!newPrimary()) {
			throw new IllegalStateException("정본이 새 DB 가 아닌데 insertPrimary 가 불렸다: " + mode.get());
		}
		String sql = m.getClientMessageId() == null ? INSERT_PLAIN : INSERT_IDEMPOTENT;
		return target.update(sql, insertParams(m)) == 1;
	}

	/**
	 * new-primary 에서 전송 식별자로 이미 저장된 행을 찾는다. 멱등 판정의 조회 쪽이다.
	 */
	public ChatMessage findSavedTransfer(Long chatRoomId, String clientMessageId) {
		List<ChatMessage> found = target.query(
			"SELECT " + ChatSplitReadRouter.COLUMNS + " FROM chat_message "
				+ "WHERE chat_room_id = ? AND client_message_id = ?",
			ChatSplitReadRouter.ROW_MAPPER, chatRoomId, clientMessageId);
		return found.isEmpty() ? null : found.get(0);
	}

	/**
	 * 가변 열 변경(삭제 · 수정)을 새 DB 에도 비춘다.
	 *
	 * <p>이중 쓰기가 삽입만 비추면 옛 DB 에서 지운 메시지가 새 DB 읽기(#120)에는
	 * 재동기화 전까지 살아 있다. 지운 내용의 노출은 배지가 틀리는 것과 무게가
	 * 다르므로, 변경 시점에 바로 비춘다. 실패는 삽입 미러와 같은 규칙이다.
	 * 송신 · 수정 · 삭제를 막지 않고 세며, 구멍은 재동기화가 메운다.
	 */
	public void mirrorMutable(ChatMessage m) {
		if (!mirroring()) {
			return;
		}
		long started = System.nanoTime();
		try {
			target.update("""
				UPDATE chat_message
				SET content = ?, is_edited = ?, original_content = ?,
				    is_deleted = ?, is_read = ?, updated_at = ?
				WHERE id = ?
				""",
				m.getContent(), m.isEdited(), m.getOriginalContent(),
				m.isDeleted(), m.isRead(),
				m.getUpdatedAt() == null ? null : java.sql.Timestamp.from(m.getUpdatedAt()),
				m.getId());
			mirrored.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, true);
		} catch (RuntimeException e) {
			mirrorFailures.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, false);
			log.warn("가변 열 이중 쓰기 실패: messageId={}, error={}", m.getId(), e.getMessage());
			// 정본 교대 뒤에는 새 DB 가 화면 읽기의 정본이다. 지운 메시지가 거기
			// 살아 있는 것을 세기만 하면 노출 창이 조용히 열린다. 작업을 실패시킨다
			if (newPrimary()) {
				throw e;
			}
		}
	}

	/**
	 * 읽음 표시의 묶음 갱신을 새 DB 에도 같은 조건으로 비춘다.
	 */
	public void mirrorReadFrom(Long chatRoomId, Long senderId) {
		if (!mirroring()) {
			return;
		}
		long started = System.nanoTime();
		try {
			target.update("""
				UPDATE chat_message SET is_read = true
				WHERE chat_room_id = ? AND sender_id = ? AND is_read = false AND is_deleted = false
				""", chatRoomId, senderId);
			chatMetrics.recordMirror(System.nanoTime() - started, true);
		} catch (RuntimeException e) {
			mirrorFailures.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, false);
			log.warn("읽음 표시 이중 쓰기 실패: chatRoomId={}, error={}", chatRoomId, e.getMessage());
			// 같은 이유로 정본 교대 뒤에는 올린다. 호출자가 비동기면 재시도 신호다
			if (newPrimary()) {
				throw e;
			}
		}
	}

	/**
	 * 배리어가 서 있으면 내려갈 때까지 기다린다. 송신 경로의 저장 직전에 불린다.
	 *
	 * <p>컷오버 순간에만 잠깐 선다. 배리어 동안 새 저장이 없으므로 그 사이에 꼬리
	 * 백필과 검증을 끝내면 잔여 불일치가 0이 된다. 상한을 넘기면 기다림을 풀고
	 * 진행한다. 그 경우 컷오버는 실패지만 송신은 산다.
	 */
	public void awaitBarrier() {
		CountDownLatch latch = barrier.get();
		if (latch == null) {
			return;
		}
		try {
			if (!latch.await(BARRIER_WAIT_MAX_MS, TimeUnit.MILLISECONDS)) {
				log.warn("쓰기 배리어가 {}ms 를 넘겨 기다림을 풀고 진행한다", BARRIER_WAIT_MAX_MS);
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	public void barrierOn() {
		barrier.compareAndSet(null, new CountDownLatch(1));
		log.info("쓰기 배리어를 세운다");
	}

	public void barrierOff() {
		CountDownLatch latch = barrier.getAndSet(null);
		if (latch != null) {
			latch.countDown();
			log.info("쓰기 배리어를 내린다");
		}
	}

	public boolean barrierUp() {
		return barrier.get() != null;
	}

	public long mirroredCount() {
		return mirrored.get();
	}

	public long mirrorFailureCount() {
		return mirrorFailures.get();
	}

	public String mode() {
		return mode.get();
	}
}
