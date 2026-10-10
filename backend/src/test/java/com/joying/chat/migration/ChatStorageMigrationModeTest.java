package com.joying.chat.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.UUID;

import javax.sql.DataSource;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.joying.chat.metrics.ChatMetrics;

/**
 * 정본 교대의 모드 전환 가드 (#123).
 *
 * <p>모드는 노드 메모리 상태라 아무 때나 바꾸면 두 노드가 다른 심판을 쓰는 창이
 * 생긴다. 배리어 아래에서만 바뀌는지, off 에서 건너뛰지 못하는지를 여기서 고정한다.
 */
class ChatStorageMigrationModeTest {

	private ChatStorageMigration migration(String mode) {
		// H2 는 풀 구성용이다. 전환 가드는 SQL 을 타지 않는다
		return new ChatStorageMigration(mock(ChatMetrics.class), mock(DataSource.class), mode,
			"jdbc:h2:mem:cutover-" + UUID.randomUUID(), "sa", "");
	}

	@Test
	@DisplayName("off 에서는 정본 교대로 건너뛸 수 없다")
	void cannotSwitchFromOff() {
		ChatStorageMigration migration = new ChatStorageMigration(
			mock(ChatMetrics.class), mock(DataSource.class), "off", "", "", "");

		assertThatThrownBy(() -> migration.setMode("new-primary"))
			.isInstanceOf(IllegalStateException.class);
	}

	@Test
	@DisplayName("이중 쓰기를 켰는데 대상 DB 주소가 없으면 기동이 선다")
	void dualWriteWithoutTargetFailsFast() {
		assertThatThrownBy(() -> new ChatStorageMigration(
			mock(ChatMetrics.class), mock(DataSource.class), "dual-write", "", "", ""))
			.isInstanceOf(IllegalStateException.class);
	}

	@Test
	@DisplayName("배리어가 없으면 정본 교대를 거절한다")
	void switchRequiresBarrier() {
		ChatStorageMigration migration = migration("dual-write");

		assertThatThrownBy(() -> migration.setMode("new-primary"))
			.isInstanceOf(IllegalStateException.class);
		assertThat(migration.newPrimary()).isFalse();
	}

	@Test
	@DisplayName("배리어 아래에서는 교대와 되돌림이 된다")
	void switchAndRevertUnderBarrier() {
		ChatStorageMigration migration = migration("dual-write");

		migration.barrierOn();
		migration.setMode("new-primary");
		assertThat(migration.newPrimary()).isTrue();
		assertThat(migration.dualWrite()).isFalse();

		migration.setMode("dual-write");
		assertThat(migration.dualWrite()).isTrue();
		migration.barrierOff();
	}

	@Test
	@DisplayName("허용 밖의 모드 값은 거절한다")
	void rejectsUnknownMode() {
		ChatStorageMigration migration = migration("dual-write");
		migration.barrierOn();

		assertThatThrownBy(() -> migration.setMode("off"))
			.isInstanceOf(IllegalArgumentException.class);
	}
}
