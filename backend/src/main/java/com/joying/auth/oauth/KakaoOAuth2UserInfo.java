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
 */
@Getter
public class KakaoOAuth2UserInfo {

	private final String email;
	private final String name;
	private final String profileImageUrl;

	@SuppressWarnings("unchecked")
	public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
		Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
		this.email = (String) kakaoAccount.get("email");

		Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
		this.name = (String) profile.get("nickname");
		this.profileImageUrl = (String) profile.get("profile_image_url");
	}
}