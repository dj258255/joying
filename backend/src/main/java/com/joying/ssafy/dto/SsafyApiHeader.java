package com.joying.ssafy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Random;

/**
 * SSAFY 금융망 API 공통 Header
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SsafyApiHeader {

	@JsonProperty("apiName")
	private String apiName;

	@JsonProperty("transmissionDate")
	private String transmissionDate;

	@JsonProperty("transmissionTime")
	private String transmissionTime;

	@JsonProperty("institutionCode")
	private String institutionCode;

	@JsonProperty("fintechAppNo")
	private String fintechAppNo;

	@JsonProperty("apiServiceCode")
	private String apiServiceCode;

	@JsonProperty("institutionTransactionUniqueNo")
	private String institutionTransactionUniqueNo;

	@JsonProperty("apiKey")
	private String apiKey;

	@JsonProperty("userKey")
	private String userKey;

	/**
	 * 응답용 필드
	 */
	@JsonProperty("responseCode")
	private String responseCode;

	@JsonProperty("responseMessage")
	private String responseMessage;

	/**
	 * 한국 시간(KST) 가져오기
	 */
	private static LocalDateTime getKoreanTime() {
		return LocalDateTime.now(ZoneId.of("Asia/Seoul"));
	}

	/**
	 * 고유 거래 번호 생성 (YYYYMMDD + HHMMSS + 6자리 난수)
	 *
	 * @return 20자리 고유 번호
	 */
	public static String generateInstitutionTransactionUniqueNo() {
		LocalDateTime now = getKoreanTime();
		String yyyymmdd = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		String hhmmss = now.format(DateTimeFormatter.ofPattern("HHmmss"));
		String random = String.format("%06d", new Random().nextInt(1000000));
		return yyyymmdd + hhmmss + random;
	}

	/**
	 * 요청용 Header 생성 (userKey 없이)
	 */
	public static SsafyApiHeader createRequestHeader(
		String apiName,
		String apiServiceCode,
		String apiKey,
		String institutionCode,
		String fintechAppNo
	) {
		LocalDateTime now = getKoreanTime();
		return SsafyApiHeader.builder()
			.apiName(apiName)
			.transmissionDate(now.format(DateTimeFormatter.ofPattern("yyyyMMdd")))
			.transmissionTime(now.format(DateTimeFormatter.ofPattern("HHmmss")))
			.institutionCode(institutionCode)
			.fintechAppNo(fintechAppNo)
			.apiServiceCode(apiServiceCode)
			.institutionTransactionUniqueNo(generateInstitutionTransactionUniqueNo())
			.apiKey(apiKey)
			.build();
	}

	/**
	 * 요청용 Header 생성 (userKey 포함)
	 */
	public static SsafyApiHeader createRequestHeaderWithUserKey(
		String apiName,
		String apiServiceCode,
		String apiKey,
		String userKey,
		String institutionCode,
		String fintechAppNo
	) {
		LocalDateTime now = getKoreanTime();
		return SsafyApiHeader.builder()
			.apiName(apiName)
			.transmissionDate(now.format(DateTimeFormatter.ofPattern("yyyyMMdd")))
			.transmissionTime(now.format(DateTimeFormatter.ofPattern("HHmmss")))
			.institutionCode(institutionCode)
			.fintechAppNo(fintechAppNo)
			.apiServiceCode(apiServiceCode)
			.institutionTransactionUniqueNo(generateInstitutionTransactionUniqueNo())
			.apiKey(apiKey)
			.userKey(userKey)
			.build();
	}
}