package com.joying.chat.migration;

import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

/**
 * 이관 진행자(사람 또는 스크립트)가 배리어를 올리고 내리는 손잡이 (#105).
 *
 * <p>기본으로 닫혀 있다. joying.chat.migration.admin-enabled=true 일 때만 뜨고,
 * 이관을 돌리는 로컬 · 내부 환경에서만 켜는 것을 전제한다. 운영에 그대로 열면
 * 아무나 송신을 멈출 수 있다.
 */
@RestController
@RequestMapping("/internal/chat-migration")
@ConditionalOnProperty(name = "joying.chat.migration.admin-enabled", havingValue = "true")
@RequiredArgsConstructor
public class ChatMigrationController {

	private final ChatStorageMigration migration;

	@GetMapping
	public Map<String, Object> status() {
		return Map.of(
			"mode", migration.mode(),
			"barrier", migration.barrierUp(),
			"mirrored", migration.mirroredCount(),
			"mirrorFailures", migration.mirrorFailureCount());
	}

	@PostMapping("/barrier/on")
	public Map<String, Object> barrierOn() {
		migration.barrierOn();
		return status();
	}

	@PostMapping("/barrier/off")
	public Map<String, Object> barrierOff() {
		migration.barrierOff();
		return status();
	}
}
