package com.joying.chat.controller

import com.joying.chat.dto.ChatRoomResponse
import com.joying.chat.dto.ChatRoomSettingsResponse
import com.joying.chat.dto.CreateChatRoomRequest
import com.joying.chat.dto.UpdateChatRoomSettingsRequest
import com.joying.chat.service.ChatRoomService
import com.joying.chat.service.ChatService
import com.joying.common.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

/**
 * 채팅방 REST API Controller
 *
 * 채팅방 생성, 조회, 관리 기능
 */
@Tag(name = "Chat Room", description = "채팅방 API")
@RestController
@RequestMapping("/api/v1/chat-rooms")
class ChatRoomController(
    private val chatRoomService: ChatRoomService,
    private val chatService: ChatService
) {
    private val logger = LoggerFactory.getLogger(ChatRoomController::class.java)

    /**
     * 채팅방 생성 또는 조회
     *
     * 이미 존재하는 채팅방이 있으면 기존 채팅방 반환
     * (상품 + 구매자 + 판매자 조합으로 유일성 보장)
     *
     * @param request 채팅방 생성 요청 (productId)
     * @return 생성/조회된 채팅방 정보
     */
    @Operation(summary = "채팅방 생성 또는 조회", description = "상품에 대한 채팅방을 생성하거나 기존 채팅방을 반환합니다")
    @PostMapping
    fun createOrGetChatRoom(
        @RequestBody request: CreateChatRoomRequest
    ): ResponseEntity<ApiResponse.SuccessBody<ChatRoomResponse>> {
        val memberId = getCurrentMemberId()

        logger.info("채팅방 생성/조회 요청: productId={}, memberId={}", request.productId, memberId)

        // Service에서 DTO까지 완성해서 반환 (lazy loading 문제 방지)
        val chatRoomDto = chatRoomService.getOrCreateChatRoomResponse(request.productId, memberId)

        return ApiResponse.ok("채팅방이 생성되었습니다", chatRoomDto)
    }

    /**
     * 내 채팅방 목록 조회
     *
     * 내가 참여 중인 모든 채팅방 목록 반환
     * (안읽은 메시지 개수 포함, 응답 헤더로 총 안읽은 개수 제공)
     *
     * @return 채팅방 목록 (+ 헤더: X-Total-Unread-Count)
     */
    @Operation(
        summary = "내 채팅방 목록 조회",
        description = "내가 참여 중인 모든 채팅방 목록을 반환합니다. 응답 헤더 X-Total-Unread-Count에 총 안읽은 메시지 개수가 포함됩니다."
    )
    @GetMapping
    suspend fun getMyChatRooms(): ResponseEntity<ApiResponse.SuccessBody<List<ChatRoomResponse>>> {
        val memberId = getCurrentMemberId()

        logger.info("채팅방 목록 조회 요청: memberId={}", memberId)

        val chatRooms = chatRoomService.getMyChatRooms(memberId)

        // 총 안읽은 개수 계산 (헤더로 전달)
        val totalUnreadCount = chatRooms.sumOf { it.unreadCount }

        val response = ApiResponse.ok("채팅방 목록 조회 완료", chatRooms)

        return ResponseEntity.ok()
            .header("X-Total-Unread-Count", totalUnreadCount.toString())
            .body(response.body)
    }

    /**
     * 채팅방 상세 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param include 포함할 추가 정보 (member: 참여자 온라인 상태 등)
     * @return 채팅방 상세 정보
     */
    @Operation(
        summary = "채팅방 상세 조회",
        description = "특정 채팅방의 상세 정보를 반환합니다. include=member 파라미터로 참여자 온라인 상태를 포함할 수 있습니다."
    )
    @GetMapping("/{chatRoomId}")
    suspend fun getChatRoomDetail(
        @PathVariable chatRoomId: Long,
        @RequestParam(required = false) include: String?
    ): ResponseEntity<ApiResponse.SuccessBody<ChatRoomResponse>> {
        val memberId = getCurrentMemberId()

        logger.info("채팅방 상세 조회 요청: chatRoomId={}, memberId={}, include={}", chatRoomId, memberId, include)

        // include 파라미터 파싱 (쉼표로 구분된 값)
        val includes = include?.split(",")?.map { it.trim() } ?: emptyList()
        val includeMember = includes.contains("member")

        val chatRoom = chatRoomService.getChatRoomDetail(chatRoomId, memberId, includeMember)

        return ApiResponse.ok("채팅방 상세 조회 완료", chatRoom)
    }

    /**
     * 채팅방 나가기
     *
     * 채팅방 상태를 CLOSED로 변경
     *
     * @param chatRoomId 채팅방 ID
     * @return 성공 메시지
     */
    @Operation(summary = "채팅방 나가기", description = "채팅방을 나가고 상태를 종료로 변경합니다")
    @DeleteMapping("/{chatRoomId}")
    fun leaveChatRoom(
        @PathVariable chatRoomId: Long
    ): ResponseEntity<Void> {
        val memberId = getCurrentMemberId()

        logger.info("채팅방 나가기 요청: chatRoomId={}, memberId={}", chatRoomId, memberId)

        chatRoomService.leaveChatRoom(chatRoomId, memberId)

        return ApiResponse.noContent()
    }

    /**
     * 채팅방 설정 업데이트 (통합)
     *
     * 고정/알림 설정을 한번에 업데이트합니다.
     * null로 전달하면 해당 설정은 변경하지 않습니다.
     *
     * @param chatRoomId 채팅방 ID
     * @param request 업데이트할 설정 (isPinned, isMuted)
     * @return 업데이트된 설정
     */
    @Operation(
        summary = "채팅방 설정 업데이트",
        description = "채팅방 고정/알림 설정을 업데이트합니다. null로 전달하면 해당 설정은 변경하지 않습니다."
    )
    @PatchMapping("/{chatRoomId}/settings")
    fun updateSettings(
        @PathVariable chatRoomId: Long,
        @RequestBody request: UpdateChatRoomSettingsRequest
    ): ResponseEntity<ApiResponse.SuccessBody<ChatRoomSettingsResponse>> {
        val memberId = getCurrentMemberId()

        logger.info(
            "채팅방 설정 업데이트 요청: chatRoomId={}, memberId={}, isPinned={}, isMuted={}",
            chatRoomId,
            memberId,
            request.isPinned,
            request.isMuted
        )

        val settings = chatService.updateSettings(chatRoomId, memberId, request.isPinned, request.isMuted)

        return ApiResponse.ok("채팅방 설정이 업데이트되었습니다", settings)
    }

    /**
     * SecurityContext에서 현재 인증된 사용자 ID 반환
     *
     * JwtAuthenticationFilter가 쿠키 또는 Authorization 헤더에서
     * JWT 토큰을 추출하고 SecurityContext에 인증 정보를 설정합니다.
     *
     * @return 사용자 ID
     * @throws IllegalStateException 인증되지 않은 경우
     */
    private fun getCurrentMemberId(): Long {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw IllegalStateException("인증 정보가 없습니다")

        return authentication.name.toLong()
    }
}