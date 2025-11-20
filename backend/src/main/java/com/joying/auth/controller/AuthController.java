package com.joying.auth.controller;

import com.joying.auth.dto.TokenRefreshResponse;
import com.joying.auth.service.AuthService;
import com.joying.common.util.CookieUtil;
import com.joying.member.dto.MemberResponse;
import com.joying.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 인증 컨트롤러
 *
 * 로그아웃, 토큰 리프레시 등의 인증 관련 API 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "인증", description = "로그인, 로그아웃, 토큰 리프레시 API")
public class AuthController {

	private final AuthService authService;
	private final MemberService memberService;

	/**
	 * 로그아웃
	 *
	 * Refresh Token을 Redis에서 삭제하고
	 * Access Token과 Refresh Token 쿠키를 삭제합니다.
	 *
	 * @param request  HttpServletRequest
	 * @param response HttpServletResponse
	 * @return 성공 메시지
	 */
	@PostMapping("/logout")
	@Operation(summary = "로그아웃", description = "Refresh Token 삭제 및 쿠키 삭제")
	public ResponseEntity<String> logout(HttpServletRequest request,
	                                     HttpServletResponse response) {

		authService.logout(request, response);

		log.info("로그아웃 성공");

		return ResponseEntity.ok("로그아웃 성공");
	}

	/**
	 * Access Token 재발급
	 *
	 * Refresh Token을 검증하고
	 * 새로운 Access Token을 발급합니다.
	 *
	 * @param request  HttpServletRequest
	 * @param response HttpServletResponse
	 * @return 새로운 Access Token
	 */
	@PostMapping("/refresh")
	@Operation(summary = "토큰 재발급", description = "Refresh Token으로 새로운 Access Token 발급")
	public ResponseEntity<TokenRefreshResponse> refreshToken(HttpServletRequest request,
	                                                          HttpServletResponse response) {

		TokenRefreshResponse tokenResponse = authService.refreshAccessToken(request, response);

		log.info("Access Token 재발급 성공: memberId={}", tokenResponse.getMemberId());

		return ResponseEntity.ok(tokenResponse);
	}

	/**
	 * 현재 로그인한 사용자 정보 조회
	 *
	 * HttpOnly 쿠키에 저장된 JWT 토큰으로 자동 인증되어
	 * 현재 로그인한 사용자의 정보를 반환합니다.
	 *
	 * @return 현재 로그인한 사용자 정보
	 */
	@GetMapping("/me")
	@Operation(summary = "현재 사용자 정보 조회", description = "로그인한 사용자의 정보를 반환합니다. HttpOnly 쿠키로 자동 인증됩니다.")
	public ResponseEntity<MemberResponse> getCurrentMember() {
		// SecurityContext에서 인증 정보 가져오기
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
			log.warn("인증되지 않은 사용자의 /me 요청");
			return ResponseEntity.status(401).build();
		}

		// JWT에서 추출한 memberId (String)
		Long memberId = Long.parseLong(authentication.getName());

		// 회원 정보 조회
		MemberResponse memberResponse = memberService.getMemberInfo(memberId);

		log.debug("현재 사용자 정보 조회 성공: memberId={}", memberId);

		return ResponseEntity.ok(memberResponse);
	}
}