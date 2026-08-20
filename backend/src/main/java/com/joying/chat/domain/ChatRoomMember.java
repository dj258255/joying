package com.joying.chat.domain;

import java.time.Instant;
import java.util.Objects;

import org.hibernate.annotations.Comment;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * 채팅방에 대한 참여자별 설정.
 *
 * <p>읽은 시각, 고정, 알림 끄기, 나가기는 사람마다 다르다. 방에 두지 않고 여기에 둔다.
 */
@Getter
@Entity
@Table(
	name = "chat_room_member",
	uniqueConstraints = @UniqueConstraint(
		name = "uk_chat_room_member_room_member",
		columnNames = {"chat_room_id", "member_id"}),
	indexes = {
		@Index(name = "idx_chat_room_member_member", columnList = "member_id"),
		@Index(name = "idx_chat_room_member_room", columnList = "chat_room_id")
	})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoomMember extends BaseEntity {

	@Id
	@Column(name = "chat_room_member_id")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long chatRoomMemberId;

	@Comment("채팅방")
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "chat_room_id", nullable = false)
	private ChatRoom chatRoom;

	@Comment("채팅방 ID. 연관을 태우지 않고 바로 쓰려고 따로 둔다")
	@Column(name = "chat_room_id", insertable = false, updatable = false)
	private Long chatRoomId;

	@Comment("회원")
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@Comment("마지막으로 읽은 시각 (UTC). 안읽음 개수를 세는 기준이다")
	@Column(name = "last_read_at")
	private Instant lastReadAt;

	@Comment("채팅방 고정 여부")
	@Column(name = "is_pinned", nullable = false)
	private boolean isPinned;

	@Comment("알림 끄기 여부")
	@Column(name = "is_muted", nullable = false)
	private boolean isMuted;

	@Comment("이 사람이 방을 나갔는지")
	@Column(name = "is_left", nullable = false)
	private boolean isLeft;

	public ChatRoomMember(ChatRoom chatRoom, Member member) {
		this.chatRoom = chatRoom;
		this.member = member;
	}

	public void markAsRead() {
		this.lastReadAt = Instant.now();
	}

	public void markAsRead(Instant readAt) {
		this.lastReadAt = readAt;
	}

	public void pin() {
		this.isPinned = true;
	}

	public void unpin() {
		this.isPinned = false;
	}

	public void togglePin() {
		this.isPinned = !this.isPinned;
	}

	public void mute() {
		this.isMuted = true;
	}

	public void unmute() {
		this.isMuted = false;
	}

	public void toggleMute() {
		this.isMuted = !this.isMuted;
	}

	/**
	 * 이 사람만 방을 나간다. 방 자체는 남는다.
	 */
	public void leave() {
		this.isLeft = true;
	}

	/**
	 * 메시지를 보내면 다시 들어온 것으로 본다.
	 */
	public void rejoin() {
		this.isLeft = false;
	}

	@Override
	public boolean equals(Object other) {
		if (this == other) {
			return true;
		}
		if (!(other instanceof ChatRoomMember that)) {
			return false;
		}
		return this.chatRoomMemberId != null && this.chatRoomMemberId.equals(that.chatRoomMemberId);
	}

	@Override
	public int hashCode() {
		return Objects.hashCode(chatRoomMemberId);
	}
}
