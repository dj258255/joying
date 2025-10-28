package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 1원 인증 확인 요청 (checkAuthCode)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckAuthCodeRequest {

	@JsonProperty("Header")
	private SsafyApiHeader header;

	@NotBlank(message = "계좌번호는 필수입니다")
	@Pattern(regexp = "^\\d{16}$", message = "계좌번호는 16자리 숫자여야 합니다")
	@JsonProperty("accountNo")
	private String accountNo;

	@NotBlank(message = "인증 메시지는 필수입니다")
	@Size(max = 10, message = "인증 메시지는 최대 10자입니다")
	@JsonProperty("authText")
	private String authText;

	@NotBlank(message = "인증 코드는 필수입니다")
	@Pattern(regexp = "^\\d{6}$", message = "인증 코드는 6자리 숫자여야 합니다")
	@JsonProperty("authCode")
	private String authCode;
}