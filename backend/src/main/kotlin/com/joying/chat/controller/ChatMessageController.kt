package com.joying.chat.controller

import com.joying.chat.dto.ChatMessageResponse
import com.joying.chat.dto.UpdateMessageRequest
import com.joying.chat.service.ChatMessageService
import com.joying.common.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.time.Instant

/**
 * 채팅 메시지 REST API Controller
 *
 * 메시지 조회, 검색 기능
 */
@Tag(name = "Chat Message", description = "채팅 메시지 API")
@RestController
@RequestMapping("/api/v1/chat-rooms/{chatRoomId}/messages")
class ChatMessageController(
    private val chatMessageService: ChatMessageService
) {
    private val logger = LoggerFactory.getLogger(ChatMessageController::class.java)

    /**
     * 채팅 메시지 목록 조회 및 검색 (통합)
     *
     * - keyword 있음: 검색 모드 (오프셋 페이징)
     * - keyword 없음: 일반 조회 모드
     *   - before: 과거 메시지 조회 (무한 스크롤, 최신순 정렬)
     *   - after: 놓친 메시지 조회 (재연결 시, 오래된 순 정렬)
     *
     * @param chatRoomId 채팅방 ID
     * @param keyword 검색 키워드 (있으면 검색 모드)
     * @param before 이 시간 이전의 메시지 조회 (과거 방향)
     * @param after 이 시간 이후의 메시지 조회 (놓친 메시지)
     * @param page 페이지 번호 (검색 모드에서만 사용, 기본 0)
     * @param size 가져올 개수 (기본 20)
     * @return 메시지 목록
     */
    @Operation(
        summary = "채팅 메시지 목록 조회 및 검색",
        description = """
            메시지 조회 및 검색을 통합한 엔드포인트입니다.

            [일반 조회 모드 - keyword 없음]
            - before: 과거 메시지 조회 (무한 스크롤, 최신순 정렬)
            - after: 놓친 메시지 조회 (WebSocket 재연결 시, 오래된 순 정렬)
            - before와 after는 동시에 사용할 수 없습니다.

            [검색 모드 - keyword 있음]
            - keyword로 메시지 내용 검색 (오프셋 페이징)
            - page 파라미터 사용 가능
        """
    )
    @GetMapping
    suspend fun getMessages(
        @PathVariable chatRoomId: Long,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        before: Instant?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        after: Instant?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<ApiResponse.SuccessBody<List<ChatMessageResponse>>> {
        val memberId = getCurrentMemberId()

        val messages = if (keyword != null) {
            // 검색 모드
            logger.info(
                "메시지 검색 요청: chatRoomId={}, memberId={}, keyword={}, page={}, size={}",
                chatRoomId,
                memberId,
                keyword,
                page,
                size
            )
            chatMessageService.searchMessages(chatRoomId, keyword, page, size, memberId)
        } else {
            // 일반 조회 모드
            logger.info(
                "메시지 목록 조회 요청: chatRoomId={}, memberId={}, before={}, after={}, size={}",
                chatRoomId,
                memberId,
                before,
                after,
                size
            )
            chatMessageService.getMessagesBefore(chatRoomId, before, after, size, memberId)
        }

        logger.debug("메시지 조회 완료: count={}", messages.size)

        return ApiResponse.ok("메시지 목록 조회 완료", messages)
    }

    /**
     * 메시지 삭제
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @return 성공 메시지
     */
    @Operation(
        summary = "메시지 삭제",
        description = "본인의 메시지를 삭제합니다 (Soft Delete)"
    )
    @DeleteMapping("/{messageId}")
    suspend fun deleteMessage(
        @PathVariable chatRoomId: Long,
        @PathVariable messageId: String
    ): ResponseEntity<Void> {
        val memberId = getCurrentMemberId()

        logger.info(
            "메시지 삭제 요청: chatRoomId={}, messageId={}, memberId={}",
            chatRoomId,
            messageId,
            memberId
        )

        chatMessageService.deleteMessage(chatRoomId, messageId, memberId)

        return ApiResponse.noContent()
    }

    /**
     * 메시지 수정
     *
     * @param chatRoomId 채팅방 ID
     * @param messageId 메시지 ID
     * @param request 수정 요청 (새 내용)
     * @return 수정된 메시지
     */
    @Operation(
        summary = "메시지 수정",
        description = "본인의 텍스트 메시지를 수정합니다"
    )
    @PatchMapping("/{messageId}")
    suspend fun updateMessage(
        @PathVariable chatRoomId: Long,
        @PathVariable messageId: String,
        @RequestBody request: UpdateMessageRequest
    ): ResponseEntity<ApiResponse.SuccessBody<ChatMessageResponse>> {
        val memberId = getCurrentMemberId()

        logger.info(
            "메시지 수정 요청: chatRoomId={}, messageId={}, memberId={}",
            chatRoomId,
            messageId,
            memberId
        )

        val updatedMessage = chatMessageService.updateMessage(chatRoomId, messageId, memberId, request.content)

        return ApiResponse.ok("메시지가 수정되었습니다", updatedMessage)
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