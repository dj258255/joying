package com.joying.chat.controller

import com.joying.chat.dto.ChatRoomDto
import com.joying.chat.dto.CreateChatRoomRequest
import com.joying.chat.service.ChatRoomService
import com.joying.chat.service.ChatService
import com.joying.common.config.security.JwtTokenProvider
import com.joying.common.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 채팅방 REST API Controller
 *
 * 채팅방 생성, 조회, 관리 기능
 */
@Tag(name = "Chat Room", description = "채팅방 API")
@RestController
@RequestMapping("/api/chat-rooms")
class ChatRoomController(
    private val chatRoomService: ChatRoomService,
    private val chatService: ChatService,
    private val jwtTokenProvider: JwtTokenProvider
) {
    private val logger = LoggerFactory.getLogger(ChatRoomController::class.java)

    /**
     * 채팅방 생성 또는 조회
     *
     * 이미 존재하는 채팅방이 있으면 기존 채팅방 반환
     * (상품 + 구매자 + 판매자 조합으로 유일성 보장)
     *
     * @param request 채팅방 생성 요청 (productId)
     * @param authorization JWT 토큰
     * @return 생성/조회된 채팅방 정보
     */
    @Operation(summary = "채팅방 생성 또는 조회", description = "상품에 대한 채팅방을 생성하거나 기존 채팅방을 반환합니다")
    @PostMapping
    fun createOrGetChatRoom(
        @RequestBody request: CreateChatRoomRequest,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<ChatRoomDto>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 생성/조회 요청: productId={}, memberId={}", request.productId, memberId)

        val chatRoom = chatRoomService.getOrCreateChatRoom(request.productId, memberId)

        // 채팅방 DTO 변환
        val chatRoomDto = ChatRoomDto(
            chatRoomId = chatRoom.chatRoomId!!,
            productId = chatRoom.product.getProductId()!!,
            productTitle = chatRoom.product.getTitle(),
            productImageUrl = null,  // TODO: 상품 이미지 추가
            otherMemberId = if (chatRoom.buyer.getMemberId() == memberId) {
                chatRoom.seller.getMemberId()!!
            } else {
                chatRoom.buyer.getMemberId()!!
            },
            otherMemberNickname = if (chatRoom.buyer.getMemberId() == memberId) {
                chatRoom.seller.getNickname()
            } else {
                chatRoom.buyer.getNickname()
            },
            otherMemberProfileUrl = if (chatRoom.buyer.getMemberId() == memberId) {
                chatRoom.seller.getKakaoProfileImageUrl()
            } else {
                chatRoom.buyer.getKakaoProfileImageUrl()
            },
            lastMessage = chatRoom.lastMessage,
            lastMessageAt = chatRoom.lastMessageAt,
            unreadCount = 0L,  // 새 채팅방이므로 0
            status = chatRoom.status,
            isPinned = false,
            isMuted = false
        )

        return ApiResponse.ok("채팅방이 생성되었습니다", chatRoomDto)
    }

    /**
     * 내 채팅방 목록 조회
     *
     * 내가 참여 중인 모든 채팅방 목록 반환
     * (안읽은 메시지 개수 포함)
     *
     * @param authorization JWT 토큰
     * @return 채팅방 목록
     */
    @Operation(summary = "내 채팅방 목록 조회", description = "내가 참여 중인 모든 채팅방 목록을 반환합니다")
    @GetMapping
    fun getMyChatRooms(
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<List<ChatRoomDto>>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 목록 조회 요청: memberId={}", memberId)

        val chatRooms = chatRoomService.getMyChatRooms(memberId)

        return ApiResponse.ok("채팅방 목록 조회 완료", chatRooms)
    }

    /**
     * 채팅방 상세 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param authorization JWT 토큰
     * @return 채팅방 상세 정보
     */
    @Operation(summary = "채팅방 상세 조회", description = "특정 채팅방의 상세 정보를 반환합니다")
    @GetMapping("/{chatRoomId}")
    fun getChatRoomDetail(
        @PathVariable chatRoomId: Long,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<ChatRoomDto>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 상세 조회 요청: chatRoomId={}, memberId={}", chatRoomId, memberId)

        // 채팅방 목록에서 해당 채팅방만 필터링
        val chatRooms = chatRoomService.getMyChatRooms(memberId)
        val chatRoom = chatRooms.find { it.chatRoomId == chatRoomId }
            ?: throw IllegalArgumentException("채팅방을 찾을 수 없습니다")

        return ApiResponse.ok("채팅방 상세 조회 완료", chatRoom)
    }

    /**
     * 채팅방 나가기
     *
     * 채팅방 상태를 CLOSED로 변경
     *
     * @param chatRoomId 채팅방 ID
     * @param authorization JWT 토큰
     * @return 성공 메시지
     */
    @Operation(summary = "채팅방 나가기", description = "채팅방을 나가고 상태를 종료로 변경합니다")
    @DeleteMapping("/{chatRoomId}")
    fun leaveChatRoom(
        @PathVariable chatRoomId: Long,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<Void> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 나가기 요청: chatRoomId={}, memberId={}", chatRoomId, memberId)

        chatRoomService.leaveChatRoom(chatRoomId, memberId)

        return ApiResponse.noContent()
    }

    /**
     * 채팅방 고정/해제 토글
     *
     * @param chatRoomId 채팅방 ID
     * @param authorization JWT 토큰
     * @return 고정 여부
     */
    @Operation(summary = "채팅방 고정/해제", description = "채팅방 고정 상태를 토글합니다")
    @PatchMapping("/{chatRoomId}/pin")
    fun togglePin(
        @PathVariable chatRoomId: Long,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<Map<String, Boolean>>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 고정 토글 요청: chatRoomId={}, memberId={}", chatRoomId, memberId)

        val isPinned = chatService.togglePin(chatRoomId, memberId)

        return ApiResponse.ok(
            if (isPinned) "채팅방이 고정되었습니다" else "채팅방 고정이 해제되었습니다",
            mapOf("isPinned" to isPinned)
        )
    }

    /**
     * 채팅방 알림 끄기/켜기 토글
     *
     * @param chatRoomId 채팅방 ID
     * @param authorization JWT 토큰
     * @return 알림 끄기 여부
     */
    @Operation(summary = "채팅방 알림 끄기/켜기", description = "채팅방 알림 상태를 토글합니다")
    @PatchMapping("/{chatRoomId}/mute")
    fun toggleMute(
        @PathVariable chatRoomId: Long,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<Map<String, Boolean>>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info("채팅방 알림 토글 요청: chatRoomId={}, memberId={}", chatRoomId, memberId)

        val isMuted = chatService.toggleMute(chatRoomId, memberId)

        return ApiResponse.ok(
            if (isMuted) "채팅방 알림이 꺼졌습니다" else "채팅방 알림이 켜졌습니다",
            mapOf("isMuted" to isMuted)
        )
    }

    /**
     * Authorization 헤더에서 JWT 토큰 추출 후 사용자 ID 반환
     *
     * @param authorization Authorization 헤더 (Bearer {token})
     * @return 사용자 ID
     */
    private fun extractMemberIdFromToken(authorization: String): Long {
        val token = authorization.replace("Bearer ", "")
        return jwtTokenProvider.getMemberId(token)
    }
}