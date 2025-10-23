package com.joying.auth.oauth;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

/**
 * 커스텀 OAuth2User (Kakao 전용)
 *
 * Spring Security OAuth2에서 사용하는 사용자 정보를 확장하여
 * 우리 애플리케이션의 Member 정보를 포함합니다.
 */
@Getter
public class CustomOAuth2User implements OAuth2User {

	private final Long memberId;
	private final String email;
	private final Map<String, Object> attributes;
	private final String nameAttributeKey;

	public CustomOAuth2User(Long memberId, String email,
	                        Map<String, Object> attributes, String nameAttributeKey) {
		this.memberId = memberId;
		this.email = email;
		this.attributes = attributes;
		this.nameAttributeKey = nameAttributeKey;
	}

	@Override
	public Map<String, Object> getAttributes() {
		return attributes;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return Collections.emptyList();
	}

	@Override
	public String getName() {
		return attributes.get(nameAttributeKey).toString();
	}
}