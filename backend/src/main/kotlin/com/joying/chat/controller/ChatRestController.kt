package com.joying.chat.controller

import com.joying.chat.dto.*
import com.joying.chat.service.ChatService
import kotlinx.coroutines.runBlocking
import org.springframework.data.domain.Slice
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant

/**
 * 채팅 REST API 컨트롤러
 *
 * 배달의민족 Live 아키텍처 참고:
 * - 메시지 전송만 WebSocket(STOMP) 사용
 * - 나머지 기능은 모두 REST API로 제공
 * - 이유: RDB 직접 접근 최소화, 캐싱 가능, 명확한 에러 처리
 */
@RestController
@RequestMapping("/api/chat")
class ChatRestController(
    private val chatService: ChatService
) {

    /**
     * 채팅방 생성
     *
     * POST /api/chat/rooms
     * 대여 거래 시작 시 자동으로 호출되는 API
     */
    @PostMapping("/rooms")
    fun createChatRoom(
        @RequestBody request: CreateChatRoomRequest
    ): ResponseEntity<ChatRoomResponse> = runBlocking {
        val chatRoom = chatService.createChatRoom(
            rentalHisId = request.rentalHisId,
            chatRoomName = request.chatRoomName,
            ownerId = request.ownerId,
            renterId = request.renterId
        )

        ResponseEntity.ok(ChatRoomResponse.from(chatRoom))
    }

    /**
     * 내 채팅방 목록 조회
     *
     * GET /api/chat/rooms?memberId={memberId}
     */
    @GetMapping("/rooms")
    fun getChatRooms(
        @RequestParam memberId: Long
    ): ResponseEntity<List<ChatRoomResponse>> = runBlocking {
        val chatRooms = chatService.getChatRooms(memberId)

        // 각 채팅방의 마지막 메시지와 읽지 않은 수 포함
        val responses = chatRooms.map { chatRoom ->
            val lastMessage = chatService.getMessages(chatRoom.chatRoomId!!, 0, 1).content.firstOrNull()
            val unreadCount = chatService.getUnreadCount(chatRoom.chatRoomId!!, memberId)

            ChatRoomResponse.from(
                chatRoom = chatRoom,
                lastMessage = lastMessage?.let {
                    MessageResponse(
                        id = it.id!!,
                        chatRoomId = it.chatRoomId,
                        senderId = it.senderId,
                        senderName = it.senderName,
                        messageType = it.messageType,
                        content = it.content,
                        fileUrl = it.fileUrl,
                        fileName = it.fileName,
                        fileSize = it.fileSize,
                        createdAt = it.createdAt
                    )
                },
                unreadCount = unreadCount
            )
        }

        ResponseEntity.ok(responses)
    }

    /**
     * 채팅방 상세 조회
     *
     * GET /api/chat/rooms/{chatRoomId}?memberId={memberId}
     */
    @GetMapping("/rooms/{chatRoomId}")
    fun getChatRoom(
        @PathVariable chatRoomId: Long,
        @RequestParam memberId: Long
    ): ResponseEntity<ChatRoomResponse> = runBlocking {
        val chatRoom = chatService.getChatRoom(chatRoomId, memberId)
        val unreadCount = chatService.getUnreadCount(chatRoomId, memberId)

        ResponseEntity.ok(ChatRoomResponse.from(chatRoom, unreadCount = unreadCount))
    }

    /**
     * 채팅방 메시지 목록 조회 (페이징)
     *
     * GET /api/chat/rooms/{chatRoomId}/messages?page=0&size=20
     */
    @GetMapping("/rooms/{chatRoomId}/messages")
    fun getMessages(
        @PathVariable chatRoomId: Long,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Slice<MessageResponse>> = runBlocking {
        val messages = chatService.getMessages(chatRoomId, page, size)

        val responses = messages.map { message ->
            MessageResponse(
                id = message.id!!,
                chatRoomId = message.chatRoomId,
                senderId = message.senderId,
                senderName = message.senderName,
                messageType = message.messageType,
                content = message.content,
                fileUrl = message.fileUrl,
                fileName = message.fileName,
                fileSize = message.fileSize,
                createdAt = message.createdAt
            )
        }

        ResponseEntity.ok(responses)
    }

    /**
     * 채팅방 메시지 목록 조회 (커서 기반 - 무한 스크롤용)
     *
     * GET /api/chat/rooms/{chatRoomId}/messages/cursor?beforeTimestamp={timestamp}&size=20
     */
    @GetMapping("/rooms/{chatRoomId}/messages/cursor")
    fun getMessagesByCursor(
        @PathVariable chatRoomId: Long,
        @RequestParam(required = false) beforeTimestamp: Instant?,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Slice<MessageResponse>> = runBlocking {
        val messages = chatService.getMessagesByCursor(chatRoomId, beforeTimestamp, size)

        val responses = messages.map { message ->
            MessageResponse(
                id = message.id!!,
                chatRoomId = message.chatRoomId,
                senderId = message.senderId,
                senderName = message.senderName,
                messageType = message.messageType,
                content = message.content,
                fileUrl = message.fileUrl,
                fileName = message.fileName,
                fileSize = message.fileSize,
                createdAt = message.createdAt
            )
        }

        ResponseEntity.ok(responses)
    }

    /**
     * 메시지 읽음 처리 (REST API 버전)
     *
     * POST /api/chat/rooms/{chatRoomId}/read
     * WebSocket 대신 REST API로도 읽음 처리 가능
     */
    @PostMapping("/rooms/{chatRoomId}/read")
    fun markAsRead(
        @PathVariable chatRoomId: Long,
        @RequestBody request: MarkAsReadRequest
    ): ResponseEntity<Void> = runBlocking {
        chatService.markAsRead(
            chatRoomId = chatRoomId,
            memberId = request.memberId,
            messageId = request.messageId
        )

        ResponseEntity.ok().build()
    }

    /**
     * 전체 읽지 않은 메시지 수 조회
     *
     * GET /api/chat/unread?memberId={memberId}
     * 앱 배지 표시용
     */
    @GetMapping("/unread")
    fun getTotalUnreadCount(
        @RequestParam memberId: Long
    ): ResponseEntity<UnreadCountResponse> = runBlocking {
        val totalCount = chatService.getTotalUnreadCount(memberId)

        ResponseEntity.ok(UnreadCountResponse(totalUnreadCount = totalCount))
    }

    /**
     * 채팅방 종료
     *
     * POST /api/chat/rooms/{chatRoomId}/close
     * 대여 거래 종료 시 호출
     */
    @PostMapping("/rooms/{chatRoomId}/close")
    fun closeChatRoom(
        @PathVariable chatRoomId: Long
    ): ResponseEntity<Void> = runBlocking {
        chatService.closeChatRoom(chatRoomId)

        ResponseEntity.ok().build()
    }
}