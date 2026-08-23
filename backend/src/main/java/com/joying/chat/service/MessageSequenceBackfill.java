package com.joying.chat.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.joying.chat.document.ChatMessage;
import com.joying.chat.repository.ChatMessageRepository;

import lombok.RequiredArgsConstructor;

/**
 * 번호를 도입하기 전에 저장된 메시지에 번호를 채운다.
 *
 * <p>정렬 기준을 시각에서 번호로 옮기면 번호가 없는 문서가 문제가 된다. MongoDB는
 * 없는 값을 가장 작은 것으로 보므로 내림차순에서 맨 뒤로 밀린다. 새 메시지보다
 * 뒤에 놓이는 것 자체는 맞지만, 번호가 없는 것들끼리는 순서를 정할 근거가 없어
 * 읽을 때마다 자리가 바뀐다. 그래서 한 번 채워 둔다.
 *
 * <p>기준은 저장 시각이다. 이미 저장된 것에는 그것 말고 쓸 수 있는 순서가 없다.
 * 같은 밀리초에 저장된 두 건의 앞뒤는 지금 와서 알 수 없고, 여기서 정한 순서가
 * 그대로 굳는다. 앞으로 들어올 것을 바로잡는 것이 목적이지 지난 것을 복원하는
 * 것이 목적은 아니다.
 *
 * <p>서버가 여러 대여도 한 번만 도는 장치는 두지 않았다. 두 대가 같은 문서를 집어도
 * 둘 다 같은 시각순을 보고 같은 번호를 쓴다. 이 작업은 여러 번 돌아도 결과가 같다.
 */
@Component
@RequiredArgsConstructor
public class MessageSequenceBackfill implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(MessageSequenceBackfill.class);

	/** 한 번에 읽어 올 건수. 전부 메모리에 올리지 않기 위해 끊어 읽는다 */
	private static final int BATCH_SIZE = 500;

	/** 안전장치. 이만큼 돌고도 남으면 멈추고 로그로 알린다 */
	private static final int MAX_BATCHES = 200;

	private final ChatMessageRepository chatMessageRepository;
	private final MessageSequenceGenerator sequenceGenerator;

	@Override
	public void run(ApplicationArguments args) {
		long remaining = chatMessageRepository.countBySequenceIsNull();
		if (remaining == 0) {
			return;
		}

		log.info("메시지 번호 채우기 시작: 대상={}건", remaining);

		// 방마다 지금까지 쓴 가장 큰 번호. 여기서 이어 붙인다
		Map<Long, Long> nextByRoom = new LinkedHashMap<>();
		long filled = 0;

		for (int batch = 0; batch < MAX_BATCHES; batch++) {
			List<ChatMessage> targets = chatMessageRepository
				.findBySequenceIsNullOrderByCreatedAtAsc(PageRequest.of(0, BATCH_SIZE));
			if (targets.isEmpty()) {
				break;
			}

			List<ChatMessage> updated = new ArrayList<>(targets.size());
			for (ChatMessage message : targets) {
				Long roomId = message.getChatRoomId();
				long next = nextByRoom.computeIfAbsent(roomId, this::currentMaxOf) + 1;
				nextByRoom.put(roomId, next);
				message.setSequence(next);
				updated.add(message);
			}

			chatMessageRepository.saveAll(updated);
			filled += updated.size();
		}

		// 새 메시지가 채운 번호 뒤에서 시작하도록 방마다 시작값을 올려 둔다
		nextByRoom.forEach(sequenceGenerator::seedAtLeast);

		long left = chatMessageRepository.countBySequenceIsNull();
		if (left > 0) {
			log.warn("메시지 번호 채우기 미완료: 채운 건수={}, 남은 건수={}", filled, left);
			return;
		}
		log.info("메시지 번호 채우기 완료: 채운 건수={}, 방={}개", filled, nextByRoom.size());
	}

	/**
	 * 이 방에서 지금까지 쓴 가장 큰 번호. 하나도 없으면 0.
	 *
	 * <p>지운 메시지도 번호를 차지하고 있으므로 삭제 여부를 보지 않는다. 걸렀다가는
	 * 이미 쓴 번호를 다시 내주게 된다.
	 */
	private long currentMaxOf(Long chatRoomId) {
		ChatMessage newest = chatMessageRepository.findTopSequence(chatRoomId);
		if (newest == null || newest.getSequence() == null) {
			return 0L;
		}
		return newest.getSequence();
	}
}
