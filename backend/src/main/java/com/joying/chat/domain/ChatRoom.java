package com.joying.chat.domain;

import java.time.Instant;
import java.util.Objects;

import org.hibernate.annotations.Comment;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;
import com.joying.product.domain.Product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 채팅방.
 *
 * <p>상품 하나에 대해 사는 사람과 파는 사람 사이에 방이 하나 생긴다. 셋의 조합에
 * 유니크를 걸어 두어 같은 짝이 방을 두 개 만들 수 없다.
 */
@Getter
@Entity
@Table(
	name = "chat_room",
	uniqueConstraints = @UniqueConstraint(
		name = "uk_chat_room_product_buyer_seller",
		columnNames = {"product_id", "buyer_id", "seller_id"}),
	indexes = {
		@Index(name = "idx_chat_room_buyer", columnList = "buyer_id"),
		@Index(name = "idx_chat_room_seller", columnList = "seller_id"),
		@Index(name = "idx_chat_room_product", columnList = "product_id"),
		@Index(name = "idx_chat_room_last_message_at", columnList = "last_message_at"),
		@Index(name = "idx_chat_room_status", columnList = "status")
	})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom extends BaseEntity {

	@Id
	@Column(name = "chat_room_id")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long chatRoomId;

	@Comment("대여 상품")
	@ManyToOne(fetch = FetchType.LAZY, optional = true)
	@JoinColumn(name = "product_id", nullable = true)
	@Setter
	private Product product;

	@Comment("구매자 (대여자)")
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "buyer_id", nullable = false)
	private Member buyer;

	@Comment("판매자 (임대자)")
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "seller_id", nullable = false)
	private Member seller;

	@Comment("마지막 메시지 내용")
	@Column(name = "last_message", length = 500)
	private String lastMessage;

	@Comment("마지막 메시지 시간 (UTC)")
	@Column(name = "last_message_at")
	private Instant lastMessageAt;

	@Comment("채팅방 상태")
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

	@Comment("종료 시간 (UTC)")
	@Column(name = "closed_at")
	private Instant closedAt;

	public ChatRoom(Product product, Member buyer, Member seller) {
		this.product = product;
		this.buyer = buyer;
		this.seller = seller;
		this.status = ChatRoomStatus.ACTIVE;
	}

	public void updateLastMessage(String message, Instant messageAt) {
		this.lastMessage = message;
		this.lastMessageAt = messageAt;
	}

	/**
	 * 사람이 닫는다.
	 */
	public void close() {
		this.status = ChatRoomStatus.CLOSED;
		this.closedAt = Instant.now();
	}

	/**
	 * 오래 안 써서 자동으로 닫는다.
	 */
	public void autoClose() {
		this.status = ChatRoomStatus.AUTO_CLOSED;
		this.closedAt = Instant.now();
	}

	/**
	 * 다시 연다.
	 */
	public void reopen() {
		this.status = ChatRoomStatus.ACTIVE;
		this.closedAt = null;
	}

	public boolean isActive() {
		return this.status == ChatRoomStatus.ACTIVE;
	}

	/**
	 * 저장되기 전에는 서로 같다고 보지 않는다. 식별자가 없는 것끼리 같다고 하면
	 * 컬렉션에 넣는 순간 하나로 합쳐진다.
	 */
	@Override
	public boolean equals(Object other) {
		if (this == other) {
			return true;
		}
		if (!(other instanceof ChatRoom that)) {
			return false;
		}
		return this.chatRoomId != null && this.chatRoomId.equals(that.chatRoomId);
	}

	@Override
	public int hashCode() {
		return Objects.hashCode(chatRoomId);
	}
}
