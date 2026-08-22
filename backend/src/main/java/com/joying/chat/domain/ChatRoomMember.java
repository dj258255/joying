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

	@Comment("마지막으로 읽은 시각 (UTC). 화면에 보여 주는 데 쓴다")
	@Column(name = "last_read_at")
	private Instant lastReadAt;

	/**
	 * 마지막으로 읽은 메시지의 번호.
	 *
	 * <p>안읽음을 세는 기준이다. 시각으로 세면 같은 밀리초에 저장된 메시지가 경계에서
	 * 빠진다. 상대가 같은 순간에 세 건을 보내고 내가 첫 건까지 읽었을 때, 시각으로 세면
	 * 안 읽은 세 건이 한 건으로 보인다.
	 *
	 * <p>번호를 도입하기 전에 읽어 둔 사람은 이 값이 비어 있다. 그때는 시각으로 센다.
	 */
	@Comment("마지막으로 읽은 메시지 번호. 안읽음 개수를 세는 기준이다")
	@Column(name = "last_read_sequence")
	private Long lastReadSequence;

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

	/**
	 * 이 번호까지 읽었다고 표시한다.
	 *
	 * <p>뒤로 물러나지 않는다. 오래된 화면이 늦게 읽음을 보내면 이미 읽은 것이 다시
	 * 안읽음으로 돌아갈 수 있다.
	 */
	public void markAsRead(Long sequence, Instant readAt) {
		this.lastReadAt = readAt;
		if (sequence != null && (this.lastReadSequence == null || sequence > this.lastReadSequence)) {
			this.lastReadSequence = sequence;
		}
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
