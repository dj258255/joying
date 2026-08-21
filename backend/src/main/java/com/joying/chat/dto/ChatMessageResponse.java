package com.joying.chat.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.joying.chat.document.ChatMessage;
import com.joying.chat.document.MessageType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅 메시지 응답.
 *
 * <p>웹소켓으로 내보낼 때와 REST로 응답할 때 같은 모양을 쓴다.
 *
 * <p>{@code isEdited} 같은 필드에 {@link JsonProperty}를 붙인 이유는 이름을 그대로
 * 내보내기 위해서다. 붙이지 않으면 Jackson이 {@code is}를 떼고 {@code edited}로
 * 내보내는데, 화면은 {@code isEdited}를 읽는다. 이름이 바뀌면 조용히 값이 사라진다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

	private String id;
	private Long chatRoomId;
	private Long senderId;

	/** 받는 사람. 웹소켓으로 내보낼 대상을 고르는 데 쓴다 */
	private Long receiverId;

	private MessageType type;
	private String content;
	private String imageUrl;
	private String fileUrl;
	private String fileName;
	private Long fileSize;
	private String replyToMessageId;
	private Instant createdAt;
	private Instant updatedAt;

	@JsonProperty("isEdited")
	private boolean isEdited;

	private String originalContent;

	@JsonProperty("isDeleted")
	private boolean isDeleted;

	@JsonProperty("isRead")
	private boolean isRead;

	private ReplyMessageInfo replyTo;

	/**
	 * 답장 대상 메시지의 요약.
	 */
	@Getter
	@Builder(toBuilder = true)
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ReplyMessageInfo {

		private String id;
		private Long senderId;
		private String content;

		@JsonProperty("isDeleted")
		private boolean isDeleted;
	}

	public static ChatMessageResponse from(ChatMessage message) {
		return from(message, null);
	}

	/**
	 * 저장된 메시지를 응답 모양으로 옮긴다.
	 *
	 * @param replyMessage 답장 대상 메시지. 없으면 null
	 */
	public static ChatMessageResponse from(ChatMessage message, ChatMessage replyMessage) {
		ReplyMessageInfo replyTo = null;
		if (replyMessage != null) {
			replyTo = ReplyMessageInfo.builder()
				.id(replyMessage.getId())
				.senderId(replyMessage.getSenderId())
				// 지워진 메시지는 내용을 내보내지 않는다
				.content(replyMessage.isDeleted() ? null : replyMessage.getContent())
				.isDeleted(replyMessage.isDeleted())
				.build();
		}

		return ChatMessageResponse.builder()
			.id(message.getId())
			.chatRoomId(message.getChatRoomId())
			.senderId(message.getSenderId())
			.type(message.getType())
			.content(message.getContent())
			.imageUrl(message.getImageUrl())
			.fileUrl(message.getFileUrl())
			.fileName(message.getFileName())
			.fileSize(message.getFileSize())
			.replyToMessageId(message.getReplyToMessageId())
			.createdAt(message.getCreatedAt())
			.updatedAt(message.getUpdatedAt())
			.isEdited(message.isEdited())
			.originalContent(message.getOriginalContent())
			.isDeleted(message.isDeleted())
			.isRead(message.isRead())
			.replyTo(replyTo)
			.build();
	}
}
