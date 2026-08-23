package com.joying.chat.document;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 채팅 메시지.
 *
 * <p>시각은 {@link Instant}로 저장한다. 지역 시간으로 두면 서버가 어디에 있느냐에 따라
 * 순서가 달라진다.
 *
 * <p>식별자가 문자열인 것은 문서 저장소에서 옮겨 왔기 때문이다. 이미 나가 있는 값이라
 * 숫자로 바꾸면 답장이 가리키는 대상과 화면이 들고 있는 값이 전부 어긋난다.
 *
 * <p>{@code @Column}으로 이름을 못박아 둔 이유는, 저장된 열 이름이 코드의 이름 규칙에
 * 따라 흔들리지 않게 하기 위해서다.
 *
 * <p>같은 전송을 한 번만 저장하는 제약은 여기에 없다. 취소된 것을 빼는 것과 같은 이유로
 * 조건이 필요한데 JPA 로는 붙일 수 없다. 기동할 때 만든다
 * ({@code ChatMessageIndexInitializer}).
 */
@Getter
@Entity
@Table(name = "chat_message", indexes = {
	@Index(name = "idx_chat_message_room_created", columnList = "chat_room_id, created_at"),
	@Index(name = "idx_chat_message_room_sequence", columnList = "chat_room_id, sequence")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

	@Id
	@Column(name = "id", length = 36)
	@Setter
	private String id;

	@Column(name = "chat_room_id")
	private Long chatRoomId;

	/**
	 * 방 안에서 늘어나는 번호.
	 *
	 * <p>순서를 정하는 근거다. 시각으로 정하면 저장 직전에 앱 서버가 찍는 값이라
	 * 같은 사람이 연속으로 보낸 두 건이 풀에서 경합해 뒤집힌다. 서버가 늘면 시계
	 * 차이까지 더해져 사람마다 다른 순서를 볼 수 있다.
	 *
	 * <p>이 번호는 방마다 하나씩 늘어나므로 누가 먼저 받았든 모두가 같은 순서를 본다.
	 */
	@Column(name = "sequence")
	@Setter
	private Long sequence;

	@Column(name = "sender_id")
	private Long senderId;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", length = 30)
	private MessageType type;

	// 웹소켓 설정이 메시지 크기를 128KB 로 묶는다. 그보다 크게 잡을 이유가 없다
	@Column(name = "content", length = 2000)
	private String content;

	@Column(name = "image_url")
	private String imageUrl;

	@Column(name = "file_url")
	private String fileUrl;

	@Column(name = "file_name")
	private String fileName;

	@Column(name = "file_size")
	private Long fileSize;

	@Column(name = "reply_to_message_id", length = 36)
	private String replyToMessageId;

	/**
	 * 보내는 쪽이 만든 전송 식별자.
	 *
	 * <p>같은 값으로 두 번 저장되지 않게 하는 열쇠다. 애플리케이션에서 먼저 조회해
	 * 확인하면 동시에 들어온 두 요청이 둘 다 없다고 읽고 둘 다 넣는다. 그래서 판정을
	 * 저장소의 유니크 제약에 맡긴다.
	 */
	@Column(name = "client_message_id", length = 64)
	private String clientMessageId;

	@Column(name = "created_at")
	@Setter
	private Instant createdAt;

	@Column(name = "updated_at")
	@Setter
	private Instant updatedAt;

	@Column(name = "is_edited")
	@Setter
	private boolean isEdited;

	@Column(name = "original_content", length = 2000)
	@Setter
	private String originalContent;

	@Column(name = "is_deleted")
	@Setter
	private boolean isDeleted;

	@Column(name = "is_read")
	@Setter
	private boolean isRead;

	public void assign(Long sequence, String clientMessageId) {
		this.sequence = sequence;
		this.clientMessageId = clientMessageId;
	}

	private ChatMessage(Long chatRoomId, Long senderId, MessageType type, String content) {
		// 문서 저장소가 만들어 주던 것을 이제 우리가 만든다. 저장 전에 값이 있어야
		// 답장이 이 메시지를 가리킬 수 있고, 화면이 미리 그려 둔 것과도 묶인다
		this.id = java.util.UUID.randomUUID().toString();
		this.chatRoomId = chatRoomId;
		this.senderId = senderId;
		this.type = type;
		this.content = content;
	}

	public static ChatMessage createTextMessage(Long chatRoomId, Long senderId,
												String content, String replyToMessageId) {
		ChatMessage message = new ChatMessage(chatRoomId, senderId, MessageType.TEXT, content);
		message.replyToMessageId = replyToMessageId;
		return message;
	}

	public static ChatMessage createImageMessage(Long chatRoomId, Long senderId, String imageUrl,
												 String fileName, Long fileSize,
												 String replyToMessageId) {
		ChatMessage message = new ChatMessage(chatRoomId, senderId, MessageType.IMAGE, "[이미지]");
		message.imageUrl = imageUrl;
		message.fileName = fileName;
		message.fileSize = fileSize;
		message.replyToMessageId = replyToMessageId;
		return message;
	}

	public static ChatMessage createFileMessage(Long chatRoomId, Long senderId, String fileUrl,
												String fileName, Long fileSize,
												String replyToMessageId) {
		ChatMessage message =
			new ChatMessage(chatRoomId, senderId, MessageType.FILE, "[파일] " + fileName);
		message.fileUrl = fileUrl;
		message.fileName = fileName;
		message.fileSize = fileSize;
		message.replyToMessageId = replyToMessageId;
		return message;
	}

	/**
	 * 시스템이 만드는 안내 메시지. 보낸 사람이 없으므로 0으로 둔다.
	 */
	public static ChatMessage createSystemMessage(Long chatRoomId, String content) {
		return new ChatMessage(chatRoomId, 0L, MessageType.SYSTEM, content);
	}

	/**
	 * 내용을 고친다.
	 *
	 * <p>원본은 첫 수정 때만 남긴다. 이후 수정에서 다시 덮으면 무엇이 처음 내용이었는지
	 * 알 수 없게 된다.
	 *
	 * @return 이번이 첫 수정이었는지
	 */
	public boolean edit(String newContent, Instant editedAt) {
		boolean firstEdit = this.originalContent == null;
		if (firstEdit) {
			this.originalContent = this.content;
		}
		this.content = newContent;
		this.updatedAt = editedAt;
		this.isEdited = true;
		return firstEdit;
	}

	/**
	 * 지운 것으로 표시한다. 실제로 지우지는 않는다.
	 */
	public void delete() {
		this.isDeleted = true;
	}
}
