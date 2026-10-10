package com.joying.chat.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import javax.sql.DataSource;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.metrics.ChatMetrics;

/**
 * 이중 쓰기와 배리어를 검증한다 (#106).
 *
 * <p>백필 도구(scripts/backfill-chat-messages.sh)는 bash 라 여기서 돌리지 않지만,
 * 겹침의 핵심(같은 행을 두 경로가 넣어도 한 행)은 같은 upsert 패턴이라 여기서
 * 대표로 검증한다.
 */
class ChatStorageMigrationTest {

	private static PostgreSQLContainer<?> target;
	private static JdbcTemplate jdbc;

	@BeforeAll
	static void startTarget() {
		target = new PostgreSQLContainer<>("postgres:16-alpine");
		target.start();
		DriverManagerDataSource ds = new DriverManagerDataSource(
			target.getJdbcUrl(), target.getUsername(), target.getPassword());
		jdbc = new JdbcTemplate(ds);
		jdbc.execute("""
			CREATE TABLE chat_message (
			  id varchar(36) PRIMARY KEY,
			  chat_room_id bigint, sequence bigint, sender_id bigint,
			  type varchar(30), content varchar(2000),
			  image_url text, file_url text, file_name text, file_size bigint,
			  reply_to_message_id varchar(36), client_message_id varchar(64),
			  created_at timestamptz, updated_at timestamptz,
			  is_edited boolean, original_content varchar(2000),
			  is_deleted boolean, is_read boolean)
			""");
		// 운영 기동이 만드는 멱등 유니크와 같은 모양. 정본 교대의 심판이다 (#123)
		jdbc.execute("""
			CREATE UNIQUE INDEX uk_chat_message_client_id
			ON chat_message (chat_room_id, client_message_id)
			WHERE client_message_id IS NOT NULL
			""");
	}

	@AfterAll
	static void stopTarget() {
		target.stop();
	}

	@BeforeEach
	void clean() {
		jdbc.execute("TRUNCATE chat_message");
	}

	private ChatStorageMigration dualWriter() {
		return new ChatStorageMigration(mock(ChatMetrics.class), mock(DataSource.class),
			"dual-write", target.getJdbcUrl(), target.getUsername(), target.getPassword());
	}

	private ChatMessage message(long room, long seq, String clientMessageId) {
		ChatMessage m = ChatMessage.createTextMessage(room, 9001L, "내용 " + seq, null);
		m.setCreatedAt(Instant.now());
		m.assign(seq, clientMessageId);
		return m;
	}

	@Test
	@DisplayName("이중 쓰기는 새 DB 에 같은 행을 남긴다")
	void mirrorsToTarget() {
		ChatStorageMigration migration = dualWriter();
		migration.mirror(message(501L, 1L, "cmid-1"));

		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM chat_message WHERE chat_room_id = 501", Long.class))
			.isEqualTo(1L);
		assertThat(migration.mirroredCount()).isEqualTo(1L);
		assertThat(migration.mirrorFailureCount()).isZero();
	}

	@Test
	@DisplayName("백필이 먼저 넣은 행을 이중 쓰기가 다시 넣어도 한 행이다")
	void overlapWithBackfillIsIdempotent() {
		ChatStorageMigration migration = dualWriter();
		ChatMessage m = message(502L, 7L, "cmid-7");

		// 백필(스테이징 upsert)이 먼저 같은 id 를 넣은 상황
		jdbc.update("INSERT INTO chat_message (id, chat_room_id, sequence, content) "
			+ "VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
			m.getId(), 502L, 7L, "내용 7");

		migration.mirror(m);

		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM chat_message WHERE id = ?", Long.class, m.getId()))
			.isEqualTo(1L);
	}

	@Test
	@DisplayName("off 모드는 새 DB 주소가 없어도 아무 일도 하지 않는다")
	void offModeIsNoop() {
		ChatStorageMigration migration = new ChatStorageMigration(
			mock(ChatMetrics.class), mock(DataSource.class), "off", "", "", "");
		migration.mirror(message(503L, 1L, "cmid-off"));
		assertThat(migration.mirroredCount()).isZero();
	}

	@Test
	@DisplayName("배리어가 서 있으면 송신이 기다리고 내려가면 바로 지나간다")
	void barrierBlocksUntilReleased() throws Exception {
		ChatStorageMigration migration = new ChatStorageMigration(
			mock(ChatMetrics.class), mock(DataSource.class), "off", "", "", "");
		migration.barrierOn();

		CountDownLatch passed = new CountDownLatch(1);
		ExecutorService pool = Executors.newSingleThreadExecutor();
		long started = System.nanoTime();
		pool.submit(() -> {
			migration.awaitBarrier();
			passed.countDown();
		});

		// 배리어가 서 있는 동안은 지나가지 못한다
		assertThat(passed.await(300, TimeUnit.MILLISECONDS)).isFalse();

		migration.barrierOff();
		assertThat(passed.await(2, TimeUnit.SECONDS)).isTrue();
		long waitedMillis = Duration.ofNanos(System.nanoTime() - started).toMillis();
		assertThat(waitedMillis).isLessThan(5000);
		pool.shutdownNow();

		// 내려간 뒤에는 기다리지 않는다
		long again = System.nanoTime();
		migration.awaitBarrier();
		assertThat(Duration.ofNanos(System.nanoTime() - again).toMillis()).isLessThan(50);
	}
	@Test
	@DisplayName("정본 교대 뒤 같은 전송 식별자의 두 번째 삽입은 0행이다")
	void primaryInsertArbitratesDuplicateTransfer() {
		ChatStorageMigration migration = dualWriter();
		migration.barrierOn();
		migration.setMode("new-primary");
		migration.barrierOff();

		ChatMessage first = message(504L, 11L, "cmid-dup");
		ChatMessage second = message(504L, 12L, "cmid-dup");

		assertThat(migration.insertPrimary(first)).isTrue();
		assertThat(migration.insertPrimary(second)).isFalse();
		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM chat_message WHERE chat_room_id = 504", Long.class))
			.isEqualTo(1L);
		// 패자가 읽을 먼저 저장된 행
		assertThat(migration.findSavedTransfer(504L, "cmid-dup").getId())
			.isEqualTo(first.getId());
	}

	@Test
	@DisplayName("전송 식별자가 없는 정본 삽입은 중재 없이 들어간다")
	void primaryInsertWithoutClientIdJustInserts() {
		ChatStorageMigration migration = dualWriter();
		migration.barrierOn();
		migration.setMode("new-primary");
		migration.barrierOff();

		assertThat(migration.insertPrimary(message(505L, 1L, null))).isTrue();
		assertThat(migration.insertPrimary(message(505L, 2L, null))).isTrue();
		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM chat_message WHERE chat_room_id = 505", Long.class))
			.isEqualTo(2L);
	}
}
