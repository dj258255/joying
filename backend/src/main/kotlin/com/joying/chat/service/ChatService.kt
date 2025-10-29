package com.joying.chat.service

import com.joying.chat.domain.*
import com.joying.chat.repository.ChatRoomMemberRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.chat.repository.MessageRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Slice
import org.springframework.data.domain.Sort
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 채팅 서비스
 *
 * Kotlin Coroutines + STOMP를 활용한 실시간 채팅 서비스
 * - 단일 서버 구성 (인메모리 브로커)
 * - MySQL(채팅방) + MongoDB(메시지) 하이브리드 구조
 */
@Service
@Transactional(readOnly = true)
class ChatService(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val messageRepository: MessageRepository,
    private val messagingTemplate: SimpMessagingTemplate
) {

    /**
     * 채팅방 생성 (대여 거래 시작 시 자동 호출)
     *
     * @param rentalHisId 대여 거래 ID
     * @param chatRoomName 채팅방 이름 (상품명)
     * @param ownerId 물건 제공자 ID
     * @param renterId 대여받는 사람 ID
     */
    @Transactional
    suspend fun createChatRoom(
        rentalHisId: Long,
        chatRoomName: String,
        ownerId: Long,
        renterId: Long
    ): ChatRoom = withContext(Dispatchers.IO) {
        // 이미 존재하는 채팅방이 있는지 확인
        chatRoomRepository.findByRentalHisId(rentalHisId).orElseGet {
            // 채팅방 생성
            val chatRoom = ChatRoom(
                rentalHisId = rentalHisId,
                name = chatRoomName,
                status = ChatRoomStatus.ACTIVE
            )

            // 참여자 추가
            val owner = ChatRoomMember(
                memberId = ownerId,
                role = ChatRoomMemberRole.OWNER
            )
            val renter = ChatRoomMember(
                memberId = renterId,
                role = ChatRoomMemberRole.RENTER
            )

            chatRoom.addMember(owner)
            chatRoom.addMember(renter)

            chatRoomRepository.save(chatRoom)
        }
    }

    /**
     * 메시지 전송 (MongoDB 저장 + STOMP 브로드캐스트)
     *
     * @param chatRoomId 채팅방 ID
     * @param senderId 발신자 ID
     * @param senderName 발신자 이름
     * @param content 메시지 내용
     */
    @Transactional
    suspend fun sendMessage(
        chatRoomId: Long,
        senderId: Long,
        senderName: String,
        content: String
    ): Message = withContext(Dispatchers.IO) {
        // 채팅방 존재 및 참여자 확인
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { IllegalArgumentException("채팅방을 찾을 수 없습니다: $chatRoomId") }

        val sender = chatRoomMemberRepository.findByChatRoom_ChatRoomIdAndMemberId(chatRoomId, senderId)
            .orElseThrow { IllegalArgumentException("채팅방 참여자가 아닙니다: $senderId") }

        // 메시지 생성 및 저장 (MongoDB)
        val message = Message.createTextMessage(
            chatRoomId = chatRoomId,
            senderId = senderId,
            senderName = senderName,
            content = content
        )
        val savedMessage = messageRepository.save(message)

        // 상대방의 읽지 않은 메시지 수 증가
        val otherMembers = chatRoomMemberRepository.findAllByChatRoom_ChatRoomId(chatRoomId)
            .filter { it.memberId != senderId }

        otherMembers.forEach { member ->
            member.incrementUnreadCount()
        }
        chatRoomMemberRepository.saveAll(otherMembers)

        // STOMP 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/$chatRoomId", savedMessage)

        savedMessage
    }

    /**
     * 채팅방 메시지 목록 조회 (페이징)
     *
     * @param chatRoomId 채팅방 ID
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지 크기
     */
    suspend fun getMessages(
        chatRoomId: Long,
        page: Int = 0,
        size: Int = 20
    ): Slice<Message> = withContext(Dispatchers.IO) {
        val pageable = PageRequest.of(page, size, Sort.by("createdAt").descending())
        messageRepository.findByChatRoomId(chatRoomId, pageable)
    }

    /**
     * 커서 기반 메시지 조회 (무한 스크롤용)
     *
     * @param chatRoomId 채팅방 ID
     * @param beforeTimestamp 이 시간 이전의 메시지 조회 (null이면 최신부터)
     * @param size 조회할 메시지 수
     */
    suspend fun getMessagesByCursor(
        chatRoomId: Long,
        beforeTimestamp: Instant?,
        size: Int = 20
    ): Slice<Message> = withContext(Dispatchers.IO) {
        val pageable = PageRequest.of(0, size, Sort.by("createdAt").descending())

        if (beforeTimestamp != null) {
            messageRepository.findByChatRoomIdAndCreatedAtBefore(chatRoomId, beforeTimestamp, pageable)
        } else {
            messageRepository.findByChatRoomId(chatRoomId, pageable)
        }
    }

    /**
     * 메시지 읽음 처리
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @param messageId 읽은 메시지 ID (MongoDB ObjectId)
     */
    @Transactional
    suspend fun markAsRead(
        chatRoomId: Long,
        memberId: Long,
        messageId: String
    ) = withContext(Dispatchers.IO) {
        val member = chatRoomMemberRepository.findByChatRoom_ChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { IllegalArgumentException("채팅방 참여자가 아닙니다: $memberId") }

        member.markAsRead(messageId)
        chatRoomMemberRepository.save(member)
    }

    /**
     * 특정 채팅방의 읽지 않은 메시지 수 조회
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    suspend fun getUnreadCount(
        chatRoomId: Long,
        memberId: Long
    ): Int = withContext(Dispatchers.IO) {
        val member = chatRoomMemberRepository.findByChatRoom_ChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { IllegalArgumentException("채팅방 참여자가 아닙니다: $memberId") }

        member.unreadCount
    }

    /**
     * 회원의 전체 읽지 않은 메시지 수 조회 (모든 채팅방 합계)
     *
     * @param memberId 회원 ID
     */
    suspend fun getTotalUnreadCount(memberId: Long): Long = withContext(Dispatchers.IO) {
        chatRoomMemberRepository.getTotalUnreadCountByMemberId(memberId)
    }

    /**
     * 회원이 참여한 채팅방 목록 조회
     *
     * @param memberId 회원 ID
     */
    suspend fun getChatRooms(memberId: Long): List<ChatRoom> = withContext(Dispatchers.IO) {
        chatRoomRepository.findAllByMemberId(memberId)
    }

    /**
     * 채팅방 상세 조회 (접근 권한 확인)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    suspend fun getChatRoom(
        chatRoomId: Long,
        memberId: Long
    ): ChatRoom = withContext(Dispatchers.IO) {
        chatRoomRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { IllegalArgumentException("채팅방을 찾을 수 없거나 접근 권한이 없습니다: $chatRoomId") }
    }

    /**
     * 채팅방 종료 (대여 거래 종료 시)
     *
     * @param chatRoomId 채팅방 ID
     */
    @Transactional
    suspend fun closeChatRoom(chatRoomId: Long) = withContext(Dispatchers.IO) {
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { IllegalArgumentException("채팅방을 찾을 수 없습니다: $chatRoomId") }

        chatRoom.close()
        chatRoomRepository.save(chatRoom)

        // 시스템 메시지 전송
        val systemMessage = Message.createSystemMessage(
            chatRoomId = chatRoomId,
            content = "거래가 종료되어 채팅방이 닫혔습니다."
        )
        val savedMessage = messageRepository.save(systemMessage)

        // STOMP 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/$chatRoomId", savedMessage)
    }
}