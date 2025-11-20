package com.joying.auth.service;

import com.joying.auth.oauth.CustomOAuth2User;
import com.joying.auth.oauth.KakaoOAuth2UserInfo;
import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.ssafy.dto.MemberRegisterResponse;
import com.joying.ssafy.service.FinanceApiService;
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
	private final FinanceApiService financeApiService;

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
		// 1. 기존 회원 조회 또는 신규 회원 생성
		Member member = memberRepository.findByEmail(kakaoUserInfo.getEmail())
			.orElseGet(() -> createNewMember(kakaoUserInfo));

		// 2. SSAFY userKey가 없으면 자동 발급
		if (member.getSsafyUserKey() == null) {
			log.info("SSAFY userKey가 없음. 로그인 시 자동 발급 시작: memberId={}, email={}",
				member.getMemberId(), member.getEmail());

			try {
				// SSAFY 회원 등록 (userKey 자동 발급)
				MemberRegisterResponse registerResponse = financeApiService.registerMember(member.getEmail());

				// Member에 userKey 저장 (실명은 1원 인증 완료 시에만 저장)
				member.updateSsafyUserKey(registerResponse.getUserKey());
                // DB에 명시적으로 저장 (Dirty Checking만으로는 부족할 수 있으므로)
				memberRepository.save(member);

				log.info("SSAFY 회원 등록 및 userKey 발급 완료 (DB 저장): memberId={}, userKey={}",
					member.getMemberId(), registerResponse.getUserKey());

			} catch (Exception e) {
				// SSAFY API 호출 실패 시에도 로그인은 성공시킴 (userKey는 나중에 발급 가능)
				log.error("SSAFY userKey 발급 실패 (로그인은 성공 처리): memberId={}, error={}",
					member.getMemberId(), e.getMessage(), e);
			}
		}

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