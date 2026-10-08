package com.joying.chat.migration;

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
 * <p>기본값은 꺼짐이다. joying.chat.migration.mode=dual-write 로 켠다.
 */
@Component
public class ChatStorageMigration {

	private static final Logger log = LoggerFactory.getLogger(ChatStorageMigration.class);

	/** 배리어에서 송신이 기다릴 상한. 넘으면 그냥 진행한다. 송신을 영영 막는 것보다
	 * 배리어 실패(잔여 불일치)를 검증이 잡는 쪽이 낫다. */
	private static final long BARRIER_WAIT_MAX_MS = 5000;

	private static final String UPSERT = """
		INSERT INTO chat_message
		  (id, chat_room_id, sequence, sender_id, type, content,
		   image_url, file_url, file_name, file_size, reply_to_message_id,
		   client_message_id, created_at, updated_at, is_edited,
		   original_content, is_deleted, is_read)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO NOTHING
		""";

	private final String mode;
	private final ChatMetrics chatMetrics;
	private final JdbcTemplate target;
	private final AtomicReference<CountDownLatch> barrier = new AtomicReference<>();
	private final AtomicLong mirrored = new AtomicLong();
	private final AtomicLong mirrorFailures = new AtomicLong();

	public ChatStorageMigration(ChatMetrics chatMetrics,
								@Value("${joying.chat.migration.mode:off}") String mode,
								@Value("${joying.chat.migration.target.url:}") String targetUrl,
								@Value("${joying.chat.migration.target.username:}") String targetUser,
								@Value("${joying.chat.migration.target.password:}") String targetPassword) {
		this.chatMetrics = chatMetrics;
		this.mode = mode;
		if (dualWrite()) {
			if (targetUrl.isBlank()) {
				throw new IllegalStateException(
					"이중 쓰기를 켰는데 대상 DB 주소(joying.chat.migration.target.url)가 없습니다");
			}
			this.target = new JdbcTemplate(targetDataSource(targetUrl, targetUser, targetPassword));
			log.info("메시지 이중 쓰기를 켠다: target={}", targetUrl);
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
		return "dual-write".equals(mode);
	}

	/**
	 * 저장이 끝난 메시지를 새 DB 에도 쓴다. 같은 id 가 이미 있으면(백필과 겹침) 그대로
	 * 둔다. 백필과 이중 쓰기가 같은 행을 서로 다른 순서로 넣어도 최종 상태가 같다.
	 */
	public void mirror(ChatMessage m) {
		if (!dualWrite()) {
			return;
		}
		long started = System.nanoTime();
		try {
			target.update(UPSERT,
				m.getId(), m.getChatRoomId(), m.getSequence(), m.getSenderId(),
				m.getType() == null ? null : m.getType().name(), m.getContent(),
				m.getImageUrl(), m.getFileUrl(), m.getFileName(), m.getFileSize(),
				m.getReplyToMessageId(), m.getClientMessageId(),
				m.getCreatedAt() == null ? null : java.sql.Timestamp.from(m.getCreatedAt()),
				m.getUpdatedAt() == null ? null : java.sql.Timestamp.from(m.getUpdatedAt()),
				m.isEdited(), m.getOriginalContent(), m.isDeleted(), m.isRead());
			mirrored.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, true);
		} catch (RuntimeException e) {
			// 송신은 막지 않는다. 정본은 아직 옛 DB 고, 이 구멍은 검증이 잡는다.
			// 다만 조용히 지나가면 안 되므로 세고 남긴다
			mirrorFailures.incrementAndGet();
			chatMetrics.recordMirror(System.nanoTime() - started, false);
			log.warn("이중 쓰기 실패: messageId={}, error={}", m.getId(), e.getMessage());
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
		return mode;
	}
}
