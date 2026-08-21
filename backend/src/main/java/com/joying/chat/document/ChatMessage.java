package com.joying.chat.document;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 채팅 메시지.
 *
 * <p>메시지는 쌓이기만 하고 관계를 맺지 않아 MongoDB에 둔다. 시각은 {@link Instant}로
 * 저장한다. 지역 시간으로 두면 서버가 어디에 있느냐에 따라 순서가 달라진다.
 *
 * <p>{@code @Field}로 이름을 못박아 둔 이유는, 저장된 문서의 필드 이름이 코드의
 * 이름 규칙에 따라 흔들리지 않게 하기 위해서다.
 */
@Getter
@Document(collection = "chat_messages")
@CompoundIndexes({
	@CompoundIndex(name = "idx_chat_room_id_created_at", def = "{'chatRoomId': 1, 'createdAt': -1}")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

	@Id
	@Setter
	private String id;

	@Field("chatRoomId")
	@Indexed
	private Long chatRoomId;

	@Field("senderId")
	@Indexed
	private Long senderId;

	@Field("type")
	private MessageType type;

	@Field("content")
	private String content;

	@Field("imageUrl")
	private String imageUrl;

	@Field("fileUrl")
	private String fileUrl;

	@Field("fileName")
	private String fileName;

	@Field("fileSize")
	private Long fileSize;

	@Field("replyToMessageId")
	private String replyToMessageId;

	@CreatedDate
	@Field("createdAt")
	@Setter
	private Instant createdAt;

	@Field("updatedAt")
	@Setter
	private Instant updatedAt;

	@Field("isEdited")
	@Setter
	private boolean isEdited;

	@Field("originalContent")
	@Setter
	private String originalContent;

	@Field("isDeleted")
	@Setter
	private boolean isDeleted;

	@Field("isRead")
	@Setter
	private boolean isRead;

	private ChatMessage(Long chatRoomId, Long senderId, MessageType type, String content) {
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
