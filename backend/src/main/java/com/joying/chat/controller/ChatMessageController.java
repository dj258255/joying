package com.joying.chat.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.chat.dto.ChatMessageResponse;
import com.joying.chat.dto.UpdateMessageRequest;
import com.joying.chat.service.ChatMessageService;
import com.joying.common.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 채팅 메시지를 읽고 고치고 지운다.
 */
@Tag(name = "Chat Message", description = "채팅 메시지 API")
@RestController
@RequestMapping("/api/v1/chat-rooms/{chatRoomId}/messages")
@RequiredArgsConstructor
public class ChatMessageController {

	private static final Logger log = LoggerFactory.getLogger(ChatMessageController.class);

	private final ChatMessageService chatMessageService;

	/**
	 * 메시지를 읽거나 찾는다.
	 *
	 * <p>{@code keyword}가 있으면 찾기다. 없으면 목록이고, 이때 {@code before}는 과거로
	 * 거슬러 올라가는 것이고 {@code after}는 끊긴 사이에 놓친 것을 받는 것이다.
	 * 방향이 반대라 둘을 함께 보낼 수 없다.
	 *
	 * <p>커서는 시각이 아니라 방 안의 메시지 번호다. 예전 화면이 시각을 그대로 보내면
	 * 형식이 맞지 않아 400으로 떨어진다. 조용히 무시되어 엉뚱한 구간이 오는 것보다
	 * 낫다고 봤다.
	 */
	@Operation(summary = "채팅 메시지 목록 조회 및 검색",
		description = "keyword가 있으면 검색, 없으면 목록이다. before/after는 메시지 번호이며, before는 과거로, after는 놓친 것을 받는다. 둘을 함께 쓸 수 없다.")
	@GetMapping
	public ResponseEntity<ApiResponse.SuccessBody<List<ChatMessageResponse>>> getMessages(
		@PathVariable Long chatRoomId,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) Long before,
		@RequestParam(required = false) Long after,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size) {

		Long memberId = CurrentMember.id();

		List<ChatMessageResponse> messages;
		if (keyword != null) {
			log.info("메시지 검색 요청: chatRoomId={}, memberId={}, keyword={}", chatRoomId, memberId, keyword);
			messages = chatMessageService.searchMessages(chatRoomId, keyword, page, size, memberId);
		} else {
			log.info("메시지 목록 조회 요청: chatRoomId={}, memberId={}, before={}, after={}",
				chatRoomId, memberId, before, after);
			messages = chatMessageService.getMessagesBefore(chatRoomId, before, after, size, memberId);
		}

		return ApiResponse.ok("메시지 목록 조회 완료", messages);
	}

	@Operation(summary = "메시지 삭제", description = "본인이 보낸 것만 지운다. 실제로 지우지는 않고 표시만 한다")
	@DeleteMapping("/{messageId}")
	public ResponseEntity<Void> deleteMessage(@PathVariable Long chatRoomId,
											  @PathVariable String messageId) {
		Long memberId = CurrentMember.id();
		log.info("메시지 삭제 요청: chatRoomId={}, messageId={}, memberId={}",
			chatRoomId, messageId, memberId);

		chatMessageService.deleteMessage(chatRoomId, messageId, memberId);
		return ApiResponse.noContent();
	}

	@Operation(summary = "메시지 수정", description = "본인이 보낸 텍스트만 고친다")
	@PatchMapping("/{messageId}")
	public ResponseEntity<ApiResponse.SuccessBody<ChatMessageResponse>> updateMessage(
		@PathVariable Long chatRoomId, @PathVariable String messageId,
		@RequestBody UpdateMessageRequest request) {

		Long memberId = CurrentMember.id();
		ChatMessageResponse updated = chatMessageService.updateMessage(
			chatRoomId, messageId, memberId, request.getContent());
		return ApiResponse.ok("메시지가 수정되었습니다", updated);
	}

	/**
	 * 특정 메시지를 가운데 두고 앞뒤를 함께 준다.
	 *
	 * <p>답장을 눌러 원본으로 뛰거나 검색 결과에서 문맥을 볼 때 쓴다. 오래된 것부터
	 * 시간순으로 준다.
	 */
	@Operation(summary = "특정 메시지 주변 조회")
	@GetMapping("/{messageId}/around")
	public ResponseEntity<ApiResponse.SuccessBody<List<ChatMessageResponse>>> getMessagesAround(
		@PathVariable Long chatRoomId, @PathVariable String messageId,
		@RequestParam(defaultValue = "20") int before,
		@RequestParam(defaultValue = "20") int after) {

		Long memberId = CurrentMember.id();
		List<ChatMessageResponse> messages =
			chatMessageService.getMessagesAround(chatRoomId, messageId, before, after, memberId);
		return ApiResponse.ok("메시지 주변 조회 완료", messages);
	}
}
