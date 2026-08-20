package com.joying.payment.event

import com.joying.chat.document.MessageType
import com.joying.chat.dto.SendMessageRequest
import com.joying.chat.repository.ChatRoomRepository
import com.joying.chat.service.ChatService
import com.joying.member.repository.MemberRepository
import com.joying.payment.service.PaymentService
import com.joying.product.repository.ProductRepository
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

/**
 * 결제 관련 이벤트 리스너
 */
@Component
class PaymentEventListener(
    private val chatService: ChatService,
    private val chatRoomRepository: ChatRoomRepository,
    private val productRepository: ProductRepository,
    private val memberRepository: MemberRepository
) {
    private val logger = LoggerFactory.getLogger(PaymentEventListener::class.java)

    /**
     * 결제 완료 이벤트 리스너
     * - 트랜잭션 커밋 후 실행 (AFTER_COMMIT)
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun handlePaymentCompleted(event: PaymentService.PaymentCompletedEvent) {
        try {
            logger.info("[결제 완료 이벤트 수신] paymentId={}, rentalHisId={}", event.paymentId, event.rentalHisId)

            // Product와 Member 조회
            val product = productRepository.findById(event.productId).orElse(null)
            val buyer = memberRepository.findById(event.buyerId).orElse(null)
            val seller = memberRepository.findById(event.sellerId).orElse(null)

            if (product == null || buyer == null || seller == null) {
                logger.warn("[결제 완료 메시지] Product 또는 Member를 찾을 수 없음")
                return
            }

            // 채팅방 조회
            val chatRoom = chatRoomRepository.findByProductAndBuyerAndSeller(product, buyer, seller).orElse(null)

            if (chatRoom == null) {
                logger.warn("[결제 완료 메시지] 채팅방을 찾을 수 없음: productId={}, buyerId={}, sellerId={}",
                    event.productId, event.buyerId, event.sellerId)
                return
            }

            // 메시지 내용 생성
            val messageContent = """
                ✅ 결제가 완료되었습니다!

                결제 금액: ${String.format("%,d", event.amount)}원
                주문번호: ${event.orderId}

                💡 판매자님, 물건을 발송해주세요!
                💡 구매자님, 판매자가 물건을 발송할 때까지 기다려주세요!

                rentalHisId:${event.rentalHisId}
                MESSAGE_TYPE:PAYMENT_COMPLETE
            """.trimIndent()

            // 채팅 메시지 전송 (시스템 메시지)
            val messageRequest = SendMessageRequest.builder()
                .type(MessageType.SYSTEM)
                .content(messageContent)
                .build()

            // 비동기로 메시지 전송
            val chatRoomId = chatRoom.chatRoomId ?: run {
                logger.warn("[결제 완료 메시지] chatRoomId가 null입니다")
                return
            }

            // 구매자 ID로 보낸다
            chatService.sendMessage(chatRoomId, event.buyerId, messageRequest)

            logger.info("[결제 완료 메시지 전송 완료] chatRoomId={}, paymentId={}", chatRoom.chatRoomId, event.paymentId)

        } catch (e: Exception) {
            // 메시지 전송 실패해도 결제는 성공이므로 로그만 남김
            logger.error("[결제 완료 메시지 전송 실패] paymentId={}", event.paymentId, e)
        }
    }
}
