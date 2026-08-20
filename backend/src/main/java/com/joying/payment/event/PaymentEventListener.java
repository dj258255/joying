package com.joying.payment.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.joying.chat.document.MessageType;
import com.joying.chat.domain.ChatRoom;
import com.joying.chat.dto.SendMessageRequest;
import com.joying.chat.repository.ChatRoomRepository;
import com.joying.chat.service.ChatService;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.payment.service.PaymentService;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

/**
 * 결제가 끝나면 채팅방에 안내 메시지를 남긴다.
 *
 * <p>커밋된 뒤에만 받는다. 커밋 전에 받으면 결제가 롤백돼도 메시지는 남는다.
 */
@Component
@RequiredArgsConstructor
public class PaymentEventListener {

	private static final Logger log = LoggerFactory.getLogger(PaymentEventListener.class);

	private final ChatService chatService;
	private final ChatRoomRepository chatRoomRepository;
	private final ProductRepository productRepository;
	private final MemberRepository memberRepository;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handlePaymentCompleted(PaymentService.PaymentCompletedEvent event) {
		try {
			log.info("[결제 완료 이벤트 수신] paymentId={}, rentalHisId={}",
				event.getPaymentId(), event.getRentalHisId());

			Product product = productRepository.findById(event.getProductId()).orElse(null);
			Member buyer = memberRepository.findById(event.getBuyerId()).orElse(null);
			Member seller = memberRepository.findById(event.getSellerId()).orElse(null);

			if (product == null || buyer == null || seller == null) {
				log.warn("[결제 완료 메시지] 상품이나 회원을 찾을 수 없음");
				return;
			}

			ChatRoom chatRoom = chatRoomRepository
				.findByProductAndBuyerAndSeller(product, buyer, seller).orElse(null);
			if (chatRoom == null || chatRoom.getChatRoomId() == null) {
				log.warn("[결제 완료 메시지] 채팅방을 찾을 수 없음: productId={}, buyerId={}, sellerId={}",
					event.getProductId(), event.getBuyerId(), event.getSellerId());
				return;
			}

			SendMessageRequest request = SendMessageRequest.builder()
				.type(MessageType.SYSTEM)
				.content(buildMessage(event))
				.build();

			// 구매자 이름으로 보낸다
			chatService.sendMessage(chatRoom.getChatRoomId(), event.getBuyerId(), request);

			log.info("[결제 완료 메시지 전송 완료] chatRoomId={}, paymentId={}",
				chatRoom.getChatRoomId(), event.getPaymentId());
		} catch (Exception e) {
			// 안내 메시지가 안 나가도 결제는 이미 끝났다. 여기서 터뜨릴 이유가 없다.
			log.error("[결제 완료 메시지 전송 실패] paymentId={}", event.getPaymentId(), e);
		}
	}

	/**
	 * 화면이 이 메시지를 파싱해 결제 카드를 그린다. 마지막 두 줄이 그 표식이라
	 * 형식을 바꾸면 카드가 안 뜬다.
	 */
	private String buildMessage(PaymentService.PaymentCompletedEvent event) {
		return """
			✅ 결제가 완료되었습니다!
			결제 금액: %,d원
			주문번호: %s
			💡 판매자님, 물건을 발송해주세요!
			💡 구매자님, 판매자가 물건을 발송할 때까지 기다려주세요!
			rentalHisId:%d
			MESSAGE_TYPE:PAYMENT_COMPLETE""".formatted(
			event.getAmount(), event.getOrderId(), event.getRentalHisId());
	}
}
