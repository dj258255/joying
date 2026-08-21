package com.joying.chat.controller;

import java.util.Arrays;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.chat.dto.ChatRoomResponse;
import com.joying.chat.dto.ChatRoomSettingsResponse;
import com.joying.chat.dto.CreateChatRoomRequest;
import com.joying.chat.dto.UpdateChatRoomSettingsRequest;
import com.joying.chat.service.ChatRoomService;
import com.joying.chat.service.ChatService;
import com.joying.common.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 채팅방을 만들고 목록과 상세를 준다.
 */
@Tag(name = "Chat Room", description = "채팅방 API")
@RestController
@RequestMapping("/api/v1/chat-rooms")
@RequiredArgsConstructor
public class ChatRoomController {

	private static final Logger log = LoggerFactory.getLogger(ChatRoomController.class);

	private final ChatRoomService chatRoomService;
	private final ChatService chatService;

	@Operation(summary = "채팅방 생성 또는 조회",
		description = "상품에 대한 채팅방을 만들거나 이미 있으면 그것을 돌려준다")
	@PostMapping
	public ResponseEntity<ApiResponse.SuccessBody<ChatRoomResponse>> createOrGetChatRoom(
		@RequestBody CreateChatRoomRequest request) {

		Long memberId = CurrentMember.id();
		log.info("채팅방 생성/조회 요청: productId={}, memberId={}", request.getProductId(), memberId);

		// 지연 로딩이 트랜잭션 밖에서 끊기지 않도록 서비스에서 응답까지 만들어 온다
		ChatRoomResponse chatRoom =
			chatRoomService.getOrCreateChatRoomResponse(request.getProductId(), memberId);
		return ApiResponse.ok("채팅방이 생성되었습니다", chatRoom);
	}

	@Operation(summary = "내 채팅방 목록 조회",
		description = "참여 중인 방을 돌려준다. 총 안읽음 개수는 X-Total-Unread-Count 헤더에 담는다")
	@GetMapping
	public ResponseEntity<ApiResponse.SuccessBody<List<ChatRoomResponse>>> getMyChatRooms(
		@RequestParam(required = false) String include) {

		Long memberId = CurrentMember.id();
		boolean includeMember = wants(include, "member");

		List<ChatRoomResponse> chatRooms = chatRoomService.getMyChatRooms(memberId, includeMember);

		// 배지를 그리는 데만 쓰므로 본문이 아니라 헤더로 보낸다
		long totalUnreadCount = chatRooms.stream()
			.mapToLong(ChatRoomResponse::getUnreadCount)
			.sum();

		log.info("채팅방 목록 조회 완료: memberId={}, 방 개수={}, 총 안읽음={}",
			memberId, chatRooms.size(), totalUnreadCount);

		return ResponseEntity.ok()
			.header("X-Total-Unread-Count", String.valueOf(totalUnreadCount))
			.body(ApiResponse.ok("채팅방 목록 조회 완료", chatRooms).getBody());
	}

	@Operation(summary = "채팅방 상세 조회")
	@GetMapping("/{chatRoomId}")
	public ResponseEntity<ApiResponse.SuccessBody<ChatRoomResponse>> getChatRoomDetail(
		@PathVariable Long chatRoomId, @RequestParam(required = false) String include) {

		Long memberId = CurrentMember.id();
		ChatRoomResponse chatRoom =
			chatRoomService.getChatRoomDetail(chatRoomId, memberId, wants(include, "member"));
		return ApiResponse.ok("채팅방 상세 조회 완료", chatRoom);
	}

	@Operation(summary = "채팅방 나가기",
		description = "이 사람만 방에서 빠진다. 방 자체는 남고 상대는 계속 볼 수 있다")
	@DeleteMapping("/{chatRoomId}")
	public ResponseEntity<Void> leaveChatRoom(@PathVariable Long chatRoomId) {
		Long memberId = CurrentMember.id();
		log.info("채팅방 나가기 요청: chatRoomId={}, memberId={}", chatRoomId, memberId);

		chatRoomService.leaveChatRoom(chatRoomId, memberId);
		return ApiResponse.noContent();
	}

	@Operation(summary = "채팅방 설정 업데이트",
		description = "고정과 알림 설정을 바꾼다. 보내지 않은 것은 바꾸지 않는다")
	@PatchMapping("/{chatRoomId}/settings")
	public ResponseEntity<ApiResponse.SuccessBody<ChatRoomSettingsResponse>> updateSettings(
		@PathVariable Long chatRoomId, @RequestBody UpdateChatRoomSettingsRequest request) {

		Long memberId = CurrentMember.id();
		ChatRoomSettingsResponse settings = chatService.updateSettings(
			chatRoomId, memberId, request.getIsPinned(), request.getIsMuted());
		return ApiResponse.ok("채팅방 설정이 업데이트되었습니다", settings);
	}

	/**
	 * {@code include=member,other} 처럼 쉼표로 붙여 보내는 값을 가린다.
	 */
	private boolean wants(String include, String what) {
		if (include == null) {
			return false;
		}
		return Arrays.stream(include.split(","))
			.map(String::trim)
			.anyMatch(what::equals);
	}
}
