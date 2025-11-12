package com.joying.chat.service

import com.joying.chat.domain.ChatRoom
import com.joying.chat.domain.ChatRoomMember
import com.joying.chat.domain.ChatRoomStatus
import com.joying.chat.dto.ChatRoomResponse
import com.joying.chat.dto.ChatRoomMemberResponse
import com.joying.chat.dto.ChatRoomStatusEvent
import com.joying.chat.repository.ChatMessageRepository
import com.joying.chat.repository.ChatRoomMemberRepository
import com.joying.chat.repository.ChatRoomRepository
import com.joying.common.exception.BusinessException
import com.joying.common.exception.ErrorCode
import com.joying.file.component.FileUrlResolver
import com.joying.file.repository.ProductFileRepository
import com.joying.member.domain.Member
import com.joying.member.repository.MemberRepository
import com.joying.product.domain.Product
import com.joying.product.repository.ProductRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

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
    private val productRepository: ProductRepository,
    private val chatPresenceService: ChatPresenceService,
    private val unreadCountService: UnreadCountService,
    private val productFileRepository: ProductFileRepository,
    private val fileUrlResolver: FileUrlResolver,
    private val permissionCache: ChatRoomPermissionCache,
    private val messagingTemplate: SimpMessagingTemplate,
    private val redisPubSubPublisher: RedisPubSubPublisher
) {
    private val logger = LoggerFactory.getLogger(ChatRoomService::class.java)

    /**
     * 채팅방 생성 또는 조회
     * (이미 존재하면 기존 채팅방 반환)
     *
     * @param productId 상품 ID
     * @param requestMemberId 요청한 회원 ID (구매자 또는 판매자)
     * @return 생성/조회된 채팅방
     */
    @Transactional
    fun getOrCreateChatRoom(productId: Long, requestMemberId: Long): ChatRoom {
        val product = productRepository.findById(productId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "상품을 찾을 수 없습니다") }

        val requestMember = memberRepository.findById(requestMemberId)
            .orElseThrow { BusinessException(ErrorCode.MEMBER_NOT_FOUND) }

        val seller = product.getWriter()

        // 자기 자신과 채팅 방지 (판매자가 본인 상품에 채팅)
        if (requestMember.getMemberId() == seller.getMemberId()) {
            throw BusinessException(ErrorCode.INVALID_INPUT_VALUE, "본인 상품에는 채팅을 보낼 수 없습니다")
        }

        // 구매자는 요청한 사람, 판매자는 상품 작성자
        val buyer = requestMember

        // 기존 채팅방 조회
        val existingChatRoom = chatRoomRepository.findByProductAndBuyerAndSeller(product, buyer, seller)

        if (existingChatRoom.isPresent) {
            val chatRoom = existingChatRoom.get()

            // 종료된 채팅방이면 재활성화
            if (!chatRoom.isActive()) {
                chatRoom.reopen()
                logger.info("채팅방 재활성화: chatRoomId={}", chatRoom.chatRoomId)
            }

            // 나간 채팅방이면 재입장 처리
            // 1. 요청한 사람 재입장
            val requestMemberRecord = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoom.chatRoomId!!, requestMemberId)
                .orElse(null)
            if (requestMemberRecord != null && requestMemberRecord.isLeft) {
                requestMemberRecord.rejoin()
                logger.info("채팅방 재입장 (요청자): chatRoomId={}, memberId={}", chatRoom.chatRoomId, requestMemberId)
            }

            // 2. 상대방도 나간 상태면 함께 재입장 (채팅방 재활성화)
            val otherMemberId = if (requestMemberId == chatRoom.buyer.getMemberId()) {
                chatRoom.seller.getMemberId()!!
            } else {
                chatRoom.buyer.getMemberId()!!
            }
            val otherMemberRecord = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoom.chatRoomId!!, otherMemberId)
                .orElse(null)
            if (otherMemberRecord != null && otherMemberRecord.isLeft) {
                otherMemberRecord.rejoin()
                logger.info("채팅방 재입장 (상대방도 자동): chatRoomId={}, memberId={}", chatRoom.chatRoomId, otherMemberId)
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
            buyer.getMemberId(),
            seller.getMemberId()
        )

        // 권한 캐시 Warmup (비동기)
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            try {
                permissionCache.warmupPermissions(savedChatRoom.chatRoomId!!)
            } catch (e: Exception) {
                logger.error("권한 캐시 Warmup 실패: chatRoomId={}", savedChatRoom.chatRoomId, e)
            }
        }

        return savedChatRoom
    }

    /**
     * 채팅방 생성 또는 조회 + DTO 반환
     * (Service에서 DTO 변환까지 처리하여 lazy loading 문제 방지)
     *
     * @param productId 상품 ID
     * @param buyerId 구매자 ID
     * @return 채팅방 DTO
     */
    @Transactional
    fun getOrCreateChatRoomResponse(productId: Long, buyerId: Long): ChatRoomResponse {
        val chatRoom = getOrCreateChatRoom(productId, buyerId)

        // Service 안에서 DTO 변환 (Transactional 범위 내에서 lazy loading 가능)
        return ChatRoomResponse(
            chatRoomId = chatRoom.chatRoomId!!,
            productId = chatRoom.product.getProductId()!!,
            productTitle = chatRoom.product.getTitle(),
            productImageUrl = getProductThumbnailUrl(chatRoom.product),
            otherMemberId = if (chatRoom.buyer.getMemberId() == buyerId) {
                chatRoom.seller.getMemberId()!!
            } else {
                chatRoom.buyer.getMemberId()!!
            },
            otherMemberNickname = if (chatRoom.buyer.getMemberId() == buyerId) {
                chatRoom.seller.getNickname()
            } else {
                chatRoom.buyer.getNickname()
            },
            otherMemberProfileUrl = if (chatRoom.buyer.getMemberId() == buyerId) {
                chatRoom.seller.getKakaoProfileImageUrl()
            } else {
                chatRoom.buyer.getKakaoProfileImageUrl()
            },
            lastMessage = chatRoom.lastMessage,
            lastMessageAt = chatRoom.lastMessageAt,
            unreadCount = 0L,
            status = chatRoom.status,
            isPinned = false,
            isMuted = false
        )
    }

    /**
     * 내 채팅방 목록 조회 (runBlocking 방식)
     *
     * 최적화:
     * - Fetch Join으로 Product, Buyer, Seller 한 번에 조회 (N+1 방지)
     * - ProductFile은 배치 조회 (1:N 관계라 Fetch Join 불가)
     * - Redis MGET으로 안읽은 개수 배치 조회
     *
     * runBlocking 사용 이유:
     * - Spring MVC 환경에서 SecurityContext 유지
     * - HTTP Thread에서 응답 반환 보장
     * - 내부에서 코루틴 기능(병렬 처리) 사용 가능
     *
     * @param memberId 회원 ID
     * @return 채팅방 목록
     */
    fun getMyChatRooms(memberId: Long): List<ChatRoomResponse> = kotlinx.coroutines.runBlocking {
        logger.info("[getMyChatRooms] 시작: memberId={}", memberId)

        // JPA Repository 조회 (Blocking이지만 충분히 빠름)
        val chatRooms = chatRoomRepository.findByMemberId(memberId)
        logger.info("[getMyChatRooms] chatRooms 조회 완료: 개수={}", chatRooms.size)

        val chatRoomMembers = chatRoomMemberRepository.findByMemberId(memberId)
        logger.info("[getMyChatRooms] chatRoomMembers 조회 완료: 개수={}", chatRoomMembers.size)

        // 채팅방별 설정 매핑 (Lazy Loading 방지를 위해 chatRoomId 직접 접근)
        val memberSettingsMap = chatRoomMembers.associateBy { it.chatRoomId }
        logger.info("[getMyChatRooms] memberSettingsMap 생성 완료")

        // Redis에서 안읽은 개수 배치 조회 (suspend fun이므로 코루틴 내에서 호출)
        val chatRoomIds = chatRooms.map { it.chatRoomId!! }
        logger.info("[getMyChatRooms] Redis 배치 조회 시작: chatRoomIds={}", chatRoomIds)
        val unreadCountMap = unreadCountService.getBatch(chatRoomIds, memberId)
        logger.info("[getMyChatRooms] Redis 배치 조회 완료: unreadCountMap={}", unreadCountMap)

        // ProductFile 배치 조회
        val productIds = chatRooms.map { it.product.getProductId()!! }
        val thumbnailMap = productFileRepository.findByProduct_ProductIdIn(productIds)
            .filter { it.isThumbnail }
            .associateBy { it.product.getProductId()!! }
            .mapValues { fileUrlResolver.toPublicUrl(it.value.file) }

        // DTO 변환
        chatRooms.map { chatRoom ->
            val settings = memberSettingsMap[chatRoom.chatRoomId]
                ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다")

            // 상대방 정보 (Fetch Join으로 이미 로드됨)
            val otherMember = if (chatRoom.buyer.getMemberId() == memberId) {
                chatRoom.seller
            } else {
                chatRoom.buyer
            }

            ChatRoomResponse(
                chatRoomId = chatRoom.chatRoomId!!,
                productId = chatRoom.product.getProductId()!!,
                productTitle = chatRoom.product.getTitle(),
                productImageUrl = thumbnailMap[chatRoom.product.getProductId()],
                otherMemberId = otherMember.getMemberId()!!,
                otherMemberNickname = otherMember.getNickname(),
                otherMemberProfileUrl = otherMember.getKakaoProfileImageUrl(),
                lastMessage = chatRoom.lastMessage,
                lastMessageAt = chatRoom.lastMessageAt,
                unreadCount = unreadCountMap[chatRoom.chatRoomId] ?: 0L,
                status = chatRoom.status,
                isPinned = settings.isPinned,
                isMuted = settings.isMuted
            )
        }
    }

    /**
     * 채팅방 상세 조회 (단일) - runBlocking 방식
     *
     * runBlocking 사용 이유:
     * - Spring MVC 환경에서 SecurityContext 유지
     * - HTTP Thread에서 응답 반환 보장
     * - 내부에서 코루틴 기능(병렬 처리) 사용 가능
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     * @param includeMember 참여자 상세 정보 포함 여부 (온라인 상태 등)
     * @return 채팅방 상세 정보
     */
    fun getChatRoomDetail(chatRoomId: Long, memberId: Long, includeMember: Boolean = false): ChatRoomResponse = kotlinx.coroutines.runBlocking {
        // 1. ChatRoom 조회 (Fetch Join으로 Product, Buyer, Seller 한 번에 로드)
        val chatRoom = chatRoomRepository.findByIdWithFetchJoin(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 권한 확인 (구매자 또는 판매자만)
        if (chatRoom.buyer.getMemberId() != memberId && chatRoom.seller.getMemberId() != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "채팅방 접근 권한이 없습니다")
        }

        // 2. Settings와 Redis 병렬 조회 (의존성 없음)
        val settingsDeferred = async {
            chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
                .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다") }
        }
        val unreadCountDeferred = async {
            unreadCountService.get(chatRoomId, memberId)
        }

        val settings = settingsDeferred.await()
        val unreadCount = unreadCountDeferred.await()

        // 상대방 정보 (Fetch Join으로 이미 로드됨)
        val otherMember = if (chatRoom.buyer.getMemberId() == memberId) {
            chatRoom.seller
        } else {
            chatRoom.buyer
        }

        // 참여자 상세 정보 (선택적)
        val memberInfo = if (includeMember) {
            val isOnline = chatPresenceService.isOnline(otherMember.getMemberId()!!)
            val lastSeenAt = if (!isOnline) {
                chatPresenceService.getLastSeenAt(otherMember.getMemberId()!!)
            } else {
                null
            }
            ChatRoomResponse.MemberInfo(
                isOnline = isOnline,
                lastSeenAt = lastSeenAt
            )
        } else {
            null
        }

        ChatRoomResponse(
            chatRoomId = chatRoom.chatRoomId!!,
            productId = chatRoom.product.getProductId()!!,
            productTitle = chatRoom.product.getTitle(),
            productImageUrl = getProductThumbnailUrl(chatRoom.product),
            otherMemberId = otherMember.getMemberId()!!,
            otherMemberNickname = otherMember.getNickname(),
            otherMemberProfileUrl = otherMember.getKakaoProfileImageUrl(),
            lastMessage = chatRoom.lastMessage,
            lastMessageAt = chatRoom.lastMessageAt,
            unreadCount = unreadCount,
            status = chatRoom.status,
            isPinned = settings.isPinned,
            isMuted = settings.isMuted,
            member = memberInfo  // ← 선택적 포함
        )
    }

    /**
     * 채팅방 나가기 (개별)
     *
     * 개별적으로 나가기 처리하며, 상대방은 계속 채팅방 유지
     * - 본인: isLeft=true, 채팅방 목록에서 제외됨
     * - 상대방: isLeft=false, 채팅방 유지 + "상대방이 나갔습니다" 표시 가능
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 회원 ID
     */
    @Transactional
    fun leaveChatRoom(chatRoomId: Long, memberId: Long) {
        val chatRoomMember = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 멤버를 찾을 수 없습니다") }

        // 채팅방 정보 조회 (상대방 ID 계산용)
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 상대방 ID 계산
        val otherMemberId = if (memberId == chatRoom.buyer.memberId) {
            chatRoom.seller.memberId!!
        } else {
            chatRoom.buyer.memberId!!
        }

        // 나가는 사용자 정보 조회 (닉네임 포함)
        val leavingMember = memberRepository.findById(memberId)
            .orElseThrow { BusinessException(ErrorCode.MEMBER_NOT_FOUND) }

        // 채팅방 나가기 처리 (개별)
        chatRoomMember.leave()

        // 권한 캐시 무효화
        permissionCache.invalidate(chatRoomId, memberId)

        logger.info("채팅방 나가기 (개별): chatRoomId={}, memberId={}", chatRoomId, memberId)

        // 시스템 메시지 저장 (MongoDB) 및 실시간 알림 전송 (비동기)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // 1. 시스템 메시지 생성 및 저장
                val systemMessage = com.joying.chat.document.ChatMessage.createSystemMessage(
                    chatRoomId = chatRoomId,
                    content = "${leavingMember.getNickname()}님이 채팅방을 나갔습니다"
                )
                systemMessage.createdAt = Instant.now()

                val savedMessage = chatMessageRepository.save(systemMessage)

                // 2. Redis Pub/Sub로 발행 (실시간 전달)
                val messageDto = com.joying.chat.dto.ChatMessageResponse.from(savedMessage, null)
                    .copy(receiverId = otherMemberId)
                redisPubSubPublisher.publish(messageDto)

                // 3. 채팅방 상태 변경 이벤트 전송 (선택적)
                val event = ChatRoomStatusEvent(
                    chatRoomId = chatRoomId,
                    eventType = ChatRoomStatusEvent.EventType.MEMBER_LEFT,
                    memberId = memberId,
                    memberNickname = leavingMember.getNickname()
                )

                messagingTemplate.convertAndSendToUser(
                    otherMemberId.toString(),
                    "/queue/chatroom-status",
                    event
                )

                logger.debug("채팅방 나가기 메시지 저장 및 이벤트 전송: chatRoomId={}, to={}", chatRoomId, otherMemberId)
            } catch (e: Exception) {
                logger.error("채팅방 나가기 메시지 저장 실패: chatRoomId={}, error={}", chatRoomId, e.message, e)
            }
        }
    }

    /**
     * 30일 미사용 채팅방 자동 종료
     * (스케줄러에서 호출)
     */
    @Transactional
    fun autoCloseInactiveChatRooms() {
        val threshold = Instant.now().minusSeconds(30L * 24 * 60 * 60)  // 30일 = 30 * 24 * 60 * 60초
        val inactiveChatRooms = chatRoomRepository.findInactiveChatRooms(ChatRoomStatus.ACTIVE, threshold)

        inactiveChatRooms.forEach { chatRoom ->
            chatRoom.autoClose()
            logger.info("채팅방 자동 종료: chatRoomId={}, lastMessageAt={}", chatRoom.chatRoomId, chatRoom.lastMessageAt)

            // 양쪽 멤버에게 실시간 알림 전송 (비동기)
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val event = ChatRoomStatusEvent(
                        chatRoomId = chatRoom.chatRoomId!!,
                        eventType = ChatRoomStatusEvent.EventType.ROOM_CLOSED,
                        memberId = 0L,  // 시스템에 의한 종료
                        memberNickname = null,
                        status = ChatRoomStatus.AUTO_CLOSED
                    )

                    // 구매자에게 알림
                    messagingTemplate.convertAndSendToUser(
                        chatRoom.buyer.memberId.toString(),
                        "/queue/chatroom-status",
                        event
                    )

                    // 판매자에게 알림
                    messagingTemplate.convertAndSendToUser(
                        chatRoom.seller.memberId.toString(),
                        "/queue/chatroom-status",
                        event
                    )

                    logger.debug(
                        "채팅방 자동 종료 이벤트 전송: chatRoomId={}, to=[{}, {}]",
                        chatRoom.chatRoomId,
                        chatRoom.buyer.memberId,
                        chatRoom.seller.memberId
                    )
                } catch (e: Exception) {
                    logger.error("채팅방 자동 종료 이벤트 전송 실패: chatRoomId={}, error={}", chatRoom.chatRoomId, e.message, e)
                }
            }
        }

        logger.info("30일 미사용 채팅방 자동 종료 완료: count={}", inactiveChatRooms.size)
    }

    /**
     * 전체 안읽은 메시지 개수 조회
     * (앱 배지 표시용, Redis 캐시 사용)
     *
     * @param memberId 회원 ID
     * @return 모든 채팅방의 안읽은 메시지 총 개수
     */
    suspend fun getTotalUnreadCount(memberId: Long): Long {
        val chatRoomMembers = withContext(Dispatchers.IO) {
            chatRoomMemberRepository.findByMemberId(memberId)
        }
        val chatRoomIds = chatRoomMembers.map { it.chatRoomId!! }  // FK 직접 접근

        // Redis에서 배치 조회 후 합산
        val unreadCountMap = unreadCountService.getBatch(chatRoomIds, memberId)
        return unreadCountMap.values.sum()
    }

    /**
     * 채팅방 참여자 정보 조회
     * (상대방 정보 + 온라인 상태 + 내 설정)
     *
     * @param chatRoomId 채팅방 ID
     * @param memberId 요청한 회원 ID
     * @return 채팅방 참여자 정보
     */
    fun getChatRoomMemberInfo(chatRoomId: Long, memberId: Long): ChatRoomMemberResponse {
        val chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방을 찾을 수 없습니다") }

        // 권한 확인 (구매자 또는 판매자만)
        if (chatRoom.buyer.getMemberId() != memberId && chatRoom.seller.getMemberId() != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "채팅방 접근 권한이 없습니다")
        }

        // 상대방 정보
        val otherMember = if (chatRoom.buyer.getMemberId() == memberId) {
            chatRoom.seller
        } else {
            chatRoom.buyer
        }

        // 내 설정 정보
        val mySettings = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "채팅방 설정을 찾을 수 없습니다") }

        // 온라인 상태 조회
        val isOnline = chatPresenceService.isOnline(otherMember.getMemberId()!!)
        val lastSeenAt = if (!isOnline) {
            chatPresenceService.getLastSeenAt(otherMember.getMemberId()!!)
        } else {
            null
        }

        return ChatRoomMemberResponse(
            memberId = otherMember.getMemberId()!!,
            nickname = otherMember.getNickname(),
            profileUrl = otherMember.getKakaoProfileImageUrl(),
            isOnline = isOnline,
            lastSeenAt = lastSeenAt,
            isPinned = mySettings.isPinned,
            isMuted = mySettings.isMuted,
            lastReadAt = mySettings.lastReadAt,
            chatRoomId = chatRoom.chatRoomId!!,
            productId = chatRoom.product.getProductId()!!,
            productTitle = chatRoom.product.getTitle()
        )
    }

    /**
     * 상품 썸네일 이미지 URL 조회
     *
     * ProductFileRepository에서 isThumbnail=true인 파일을 찾아 URL 반환
     *
     * @param product 상품 엔티티
     * @return 썸네일 이미지 URL (없으면 null)
     */
    private fun getProductThumbnailUrl(product: Product): String? {
        val productFiles = productFileRepository.findByProduct_ProductId(product.getProductId()!!)

        // isThumbnail=true인 파일 찾기 (첫 번째 이미지가 썸네일)
        val thumbnailFile = productFiles.firstOrNull { it.isThumbnail }

        return thumbnailFile?.let { fileUrlResolver.toPublicUrl(it.file) }
    }
}