package com.joying.chat.controller

import com.joying.chat.dto.MarkAsReadRequest
import com.joying.chat.dto.MessageResponse
import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.service.ChatService
import kotlinx.coroutines.runBlocking
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.stereotype.Controller

/**
 * STOMP 메시지 핸들러
 *
 * 클라이언트 → 서버 메시지 수신:
 * - /app/chat.send → sendMessage()
 * - /app/chat.read → markAsRead()
 *
 * 서버 → 클라이언트 브로드캐스트:
 * - /topic/chat/{chatRoomId} (SimpMessagingTemplate 사용)
 */
@Controller
class ChatMessageController(
    private val chatService: ChatService
) {

    /**
     * 메시지 전송 핸들러
     *
     * 클라이언트가 /app/chat.send로 메시지 전송 시 호출
     * ChatService에서 MongoDB 저장 + STOMP 브로드캐스트 처리
     */
    @MessageMapping("/chat.send")
    fun sendMessage(@Payload request: SendMessageRequest) = runBlocking {
        try {
            chatService.sendMessage(
                chatRoomId = request.chatRoomId,
                senderId = request.senderId,
                senderName = request.senderName,
                content = request.content
            )
        } catch (e: Exception) {
            // 에러 로깅 및 처리
            throw RuntimeException("메시지 전송 실패: ${e.message}", e)
        }
    }

    /**
     * 메시지 읽음 처리 핸들러
     *
     * 클라이언트가 /app/chat.read로 읽음 처리 요청 시 호출
     */
    @MessageMapping("/chat.read")
    fun markAsRead(@Payload request: MarkAsReadRequest) = runBlocking {
        try {
            chatService.markAsRead(
                chatRoomId = request.chatRoomId,
                memberId = request.memberId,
                messageId = request.messageId
            )
        } catch (e: Exception) {
            // 에러 로깅 및 처리
            throw RuntimeException("읽음 처리 실패: ${e.message}", e)
        }
    }
}