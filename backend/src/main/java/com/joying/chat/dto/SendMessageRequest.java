package com.joying.chat.dto;

import com.joying.chat.document.MessageType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 메시지 전송 요청.
 */
@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

	@NotNull(message = "메시지 타입은 필수입니다")
	private MessageType type;

	@NotBlank(message = "메시지 내용은 필수입니다")
	private String content;

	private String imageUrl;
	private String fileUrl;
	private String fileName;
	private Long fileSize;
	private String replyToMessageId;
}
