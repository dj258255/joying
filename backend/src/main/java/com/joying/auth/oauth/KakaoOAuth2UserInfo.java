package com.joying.auth.oauth;

import lombok.Getter;

import java.util.Map;

/**
 * Kakao OAuth2 사용자 정보
 *
 * Kakao API 응답 구조:
 * {
 *   "id": 123456789,
 *   "kakao_account": {
 *     "email": "user@example.com",
 *     "profile": {
 *       "nickname": "홍길동",
 *       "profile_image_url": "http://..."
 *     }
 *   }
 * }
 *
 * 참고:
 * - Kakao OAuth는 실명이 아닌 별명(nickname)을 제공합니다
 * - 실명은 1원 인증을 통해 별도로 확인해야 합니다
 */
@Getter
public class KakaoOAuth2UserInfo {

	private final String email;
	private final String nickname; // Kakao에서 제공하는 별명
	private final String profileImageUrl;

	@SuppressWarnings("unchecked")
	public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
		Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
		this.email = (String) kakaoAccount.get("email");

		Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
		this.nickname = (String) profile.get("nickname"); // Kakao 별명
		this.profileImageUrl = (String) profile.get("profile_image_url");
	}
}