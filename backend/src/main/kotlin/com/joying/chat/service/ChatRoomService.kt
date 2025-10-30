package com.joying.chat.service

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomMember
import com.joying.chat.domain.ChatRoomStatus
import com.joying.chat.dto.ChatRoomDto
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import com.joying.member.domain.Member
import com.joying.member.repository.MemberRepository
import com.joying.product.domain.Product
import com.joying.product.repository.ProductRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * 채팅방 Service
 *
 * 채팅방 생성, 조회, 관리 기능
 */
@Service
@Transactional(readOnly = true)
class ChatRoomService(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val chatMessageRepository: ChatMessageRepository,
    private val memberRepository: MemberRepository,
    private val productRepository: ProductRepository
) {
    private val logger = LoggerFactory.getLogger(ChatRoomService::class.java)

    /**
     * 채팅방 생성 또는 조회
     * (이미 존재하면 기존 채팅방 반환)
     *
     * @param productId 상품 ID
     * @param buyerId 구매자 ID
     * @return 생성/조회된 채팅방
     */
    @Transactional
    fun getOrCreateChatRoom(productId: Long, buyerId: Long): ChatRoom {
        val product = productRepository.findById(productId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "상품을 찾을 수 없습니다") }

        val buyer = memberRepository.findById(buyerId)
            .orElseThrow { BusinessException(ErrorCode.MEMBER_NOT_FOUND) }

        val seller = product.getWriter()

        // 자기 자신과 채팅 방지
        if (buyer.getMemberId() == seller.getMemberId()) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "본인 상품에는 채팅을 보낼 수 없습니다")
        }

        // 기존 채팅방 조회
        val existingChatRoom = chatRoomRepository.findByProductAndBuyerAndSeller(product, buyer, seller)

        if (existingChatRoom.isPresent) {
            val chatRoom = existingChatRoom.get()

            // 종료된 채팅방이면 재활성화
            if (!chatRoom.isActive()) {
                chatRoom.reopen()
                logger.info("채팅방 재활성화: chatRoomId={}", chatRoom.chatRoomId)
            }

            return chatRoom
        }

        // 새 채팅방 생성
        val newChatRoom = ChatRoom(
            product = product,
            buyer = buyer,
            seller = seller
        )

        val savedChatRoom = chatRoomRepository.save(newChatRoom)

        // 채팅방 멤버 생성 (구매자, 판매자)
        val buyerMember = ChatRoomMember(
            chatRoom = savedChatRoom,
            member = buyer
        )

        val sellerMember = ChatRoomMember(
            chatRoom = savedChatRoom,
            member = seller
        )

        chatRoomMemberRepository.save(buyerMember)
        chatRoomMemberRepository.save(sellerMember)

        logger.info(
            "채팅방 생성 완료: chatRoomId={}, productId={}, buyerId={}, sellerId={}",
            savedChatRoom.chatRoomId,
            productId,
            buyerId,
            seller.getMemberId()
        )

        return savedChatRoom
    }

    /**
     * 내 채팅방 목록 조회
     * (안읽은 메시지 개수 포함 - 코루틴 병렬 처리)
     *
     * @param memberId 회원 ID
     * @return 채팅방 목록
     */
    fun getMyChatRooms(memberId: Long): List<ChatRoomDto> = runBlocking {
        val chatRooms = chatRoomRepository.findByMemberId(memberId)
        val chatRoomMembers = chatRoomMemberRepository.findByMemberId(memberId)

        // 채팅방별 설정 매핑
        val memberSettingsMap = chatRoomMembers.associateBy { it.chatRoom.chatRoomId }

        // 코루틴으로 각 채팅방의 안읽은 메시지 개수를 병렬로 조회
        coroutineScope {
            chatRooms.map { chatRoom ->
                async {
                    val settings = memberSettingsMap[chatRoom.chatRoomId]
                        ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다")

                    // 상대방 정보
                    val otherMember = if (chatRoom.buyer.getMemberId() == memberId) {
                        chatRoom.seller
                    } else {
                        chatRoom.buyer
                    }

                    // 안읽은 메시지 개수 계산
                    val unreadCount = if (settings.lastReadAt != null) {
                        chatMessageRepository.countByChatRoomIdAndCreatedAtAfter(
                            chatRoom.chatRoomId!!,
                            settings.lastReadAt!!
                        )
                    } else {
                        0L
                    }

                    // DTO 변환
                    ChatRoomDto(
                        chatRoomId = chatRoom.chatRoomId!!,
                        productId = chatRoom.product.getProductId()!!,
                        productTitle = chatRoom.product.getTitle(),
                        productImageUrl = null,  // TODO: 상품 이미지 추가
                        otherMemberId = otherMember.getMemberId()!!,
                        otherMemberNickname = otherMember.getNickname(),
                        otherMemberProfileUrl = otherMember.getKakaoProfileImageUrl(),
                        lastMessage = chatRoom.lastMessage,
                        lastMessageAt = chatRoom.lastMessageAt,
                        unreadCount = unreadCount,
                        status = chatRoom.status,
                        isPinned = settings.isPinned,
                        isMuted = settings.isMuted
                    )
                }
            }.awaitAll()  // 모든 비동기 작업 완료 대기
        }
    }

    /**
     * 채팅방 나가기
     * (채팅방 종료 - CLOSED)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    @Transactional
    fun leaveChatRoom(chatRoomId: Long, memberId: Long) {
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 권한 확인 (구매자 또는 판매자만 나갈 수 있음)
        if (chatRoom.buyer.getMemberId() != memberId && chatRoom.seller.getMemberId() != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "채팅방 나가기 권한이 없습니다")
        }

        chatRoom.close()

        logger.info("채팅방 나가기: chatRoomId={}, memberId={}", chatRoomId, memberId)
    }

    /**
     * 30일 미사용 채팅방 자동 종료
     * (스케줄러에서 호출)
     */
    @Transactional
    fun autoCloseInactiveChatRooms() {
        val threshold = LocalDateTime.now().minusDays(30)
        val inactiveChatRooms = chatRoomRepository.findInactiveChatRooms(ChatRoomStatus.ACTIVE, threshold)

        inactiveChatRooms.forEach { chatRoom ->
            chatRoom.autoClose()
            logger.info("채팅방 자동 종료: chatRoomId={}, lastMessageAt={}", chatRoom.chatRoomId, chatRoom.lastMessageAt)
        }

        logger.info("30일 미사용 채팅방 자동 종료 완료: count={}", inactiveChatRooms.size)
    }
}