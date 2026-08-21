package com.joying.auth.service;

import com.joying.auth.oauth.CustomOAuth2User;
import com.joying.auth.oauth.KakaoOAuth2UserInfo;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CustomOAuth2UserService (Kakao 전용)
 *
 * Kakao OAuth2 로그인 시 사용자 정보를 처리하고
 * 신규 회원은 자동으로 가입 처리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

	private final MemberRepository memberRepository;

	@Override
	@Transactional
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
		// 1. OAuth2User 정보 로드
		OAuth2User oauth2User = super.loadUser(userRequest);

		// 2. userNameAttributeName 추출 (Kakao는 "id")
		String userNameAttributeName = userRequest.getClientRegistration()
			.getProviderDetails()
			.getUserInfoEndpoint()
			.getUserNameAttributeName();

		log.info("Kakao OAuth2 로그인 시도");

		// 3. Kakao 사용자 정보 파싱
		KakaoOAuth2UserInfo kakaoUserInfo = new KakaoOAuth2UserInfo(oauth2User.getAttributes());

		// 4. 회원 조회 또는 생성
		Member member = getOrCreateMember(kakaoUserInfo);

		log.info("Kakao OAuth2 로그인 성공: memberId={}, email={}",
			member.getMemberId(), member.getEmail());

		// 5. CustomOAuth2User 반환
		return new CustomOAuth2User(
			member.getMemberId(),
			member.getEmail(),
			oauth2User.getAttributes(),
			userNameAttributeName
		);
	}

	/**
	 * 회원 조회 또는 생성
	 *
	 * @param kakaoUserInfo Kakao 사용자 정보
	 * @return Member
	 */
	private Member getOrCreateMember(KakaoOAuth2UserInfo kakaoUserInfo) {
		// 기존 회원 조회 또는 신규 회원 생성
		Member member = memberRepository.findByEmail(kakaoUserInfo.getEmail())
			.orElseGet(() -> createNewMember(kakaoUserInfo));

		return member;
	}

	/**
	 * 신규 회원 생성
	 *
	 * @param kakaoUserInfo Kakao 사용자 정보
	 * @return 생성된 Member
	 */
	private Member createNewMember(KakaoOAuth2UserInfo kakaoUserInfo) {
		log.info("신규 Kakao 회원 가입: email={}, nickname={}",
			kakaoUserInfo.getEmail(), kakaoUserInfo.getNickname());

		Member newMember = Member.builder()
			.nickname(kakaoUserInfo.getNickname()) // Kakao 별명 (실명 아님)
			.name(null) // 실명은 1원 인증 후 저장
			.email(kakaoUserInfo.getEmail())
			.profileImage(null)
			.kakaoProfileImageUrl(kakaoUserInfo.getProfileImageUrl()) // Kakao 프로필 이미지 URL 저장
			.build();

		return memberRepository.save(newMember);
	}
}