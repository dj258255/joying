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

	/**
	 * 이 전송을 가리키는 값.
	 *
	 * <p>보내는 쪽이 만든다. 발행이 실패해 사용자가 다시 보내면 같은 값이 온다.
	 * 저장에 유니크 제약이 걸려 있어 두 번째는 새 문서를 만들지 않는다.
	 *
	 * <p>비어 있을 수 있다. 예전 화면은 이 값을 보내지 않으므로, 없으면 멱등을
	 * 걸지 않고 그대로 저장한다.
	 */
	private String clientMessageId;
}
