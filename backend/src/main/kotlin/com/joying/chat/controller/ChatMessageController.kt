package com.joying.chat.controller

import com.joying.chat.dto.ChatMessageDto
import com.joying.chat.service.ChatMessageService
import com.joying.common.config.security.JwtTokenProvider
import com.joying.common.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime

/**
 * 채팅 메시지 REST API Controller
 *
 * 메시지 조회, 검색 기능
 */
@Tag(name = "Chat Message", description = "채팅 메시지 API")
@RestController
@RequestMapping("/api/chat-rooms/{chatRoomId}/messages")
class ChatMessageController(
    private val chatMessageService: ChatMessageService,
    private val jwtTokenProvider: JwtTokenProvider
) {
    private val logger = LoggerFactory.getLogger(ChatMessageController::class.java)

    /**
     * 채팅 메시지 목록 조회 (커서 기반 페이징)
     *
     * 무한 스크롤용 - before 파라미터로 이전 메시지 불러오기
     *
     * @param chatRoomId 채팅방 ID
     * @param before 이 시간 이전의 메시지 조회 (nullable)
     * @param size 가져올 개수 (기본 20)
     * @param authorization JWT 토큰
     * @return 메시지 목록 (최신순)
     */
    @Operation(
        summary = "채팅 메시지 목록 조회",
        description = "커서 기반 페이징으로 채팅 메시지 목록을 조회합니다. before 파라미터를 사용하여 이전 메시지를 불러올 수 있습니다."
    )
    @GetMapping
    fun getMessages(
        @PathVariable chatRoomId: Long,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        before: LocalDateTime?,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<List<ChatMessageDto>>> = runBlocking {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info(
            "메시지 목록 조회 요청: chatRoomId={}, memberId={}, before={}, size={}",
            chatRoomId,
            memberId,
            before,
            size
        )

        // TODO: 채팅방 접근 권한 확인 (구매자 또는 판매자인지)

        val messages = chatMessageService.getMessagesBefore(chatRoomId, before, size)

        logger.debug("메시지 목록 조회 완료: count={}", messages.size)

        ApiResponse.ok("메시지 목록 조회 완료", messages)
    }

    /**
     * 채팅 메시지 검색
     *
     * 채팅방 내에서 키워드로 메시지 검색
     *
     * @param chatRoomId 채팅방 ID
     * @param keyword 검색 키워드
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지 크기 (기본 20)
     * @param authorization JWT 토큰
     * @return 검색된 메시지 목록
     */
    @Operation(
        summary = "채팅 메시지 검색",
        description = "채팅방 내에서 키워드로 메시지를 검색합니다"
    )
    @GetMapping("/search")
    fun searchMessages(
        @PathVariable chatRoomId: Long,
        @RequestParam keyword: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<List<ChatMessageDto>>> = runBlocking {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info(
            "메시지 검색 요청: chatRoomId={}, memberId={}, keyword={}, page={}, size={}",
            chatRoomId,
            memberId,
            keyword,
            page,
            size
        )

        // TODO: 채팅방 접근 권한 확인 (구매자 또는 판매자인지)

        val messages = chatMessageService.searchMessages(chatRoomId, keyword, page, size)

        logger.debug("메시지 검색 완료: keyword={}, count={}", keyword, messages.size)

        ApiResponse.ok("메시지 검색 완료", messages)
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