package com.joying.member.controller;

import com.joying.common.exception.BusinessException;
import com.joying.common.exception.ErrorCode;
import com.joying.member.dto.MemberProfileUpdateRequest;
import com.joying.member.dto.MemberResponse;
import com.joying.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * 회원 컨트롤러 (RESTful 설계)
 *
 * 회원 리소스에 대한 CRUD API 제공
 * - GET    /api/members/{memberId}    회원 정보 조회
 * - PUT    /api/members/{memberId}    회원 정보 수정 (본인만)
 * - DELETE /api/members/{memberId}    회원 탈퇴 (본인만)
 */
@Slf4j
@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
@Tag(name = "회원", description = "회원 정보 조회, 수정, 탈퇴 API (RESTful)")
public class MemberController {

	private final MemberService memberService;

	/**
	 * 회원 정보 조회
	 *
	 * @param memberId       조회할 회원 ID
	 * @param authentication Spring Security Authentication (현재 로그인한 사용자)
	 * @return 회원 정보
	 */
	@GetMapping("/{memberId}")
	@Operation(
		summary = "회원 정보 조회",
		description = """
			특정 회원의 정보를 조회합니다.

			**인증 필요**: 예

			**예시**:
			- 본인 조회: `GET /api/members/1` (memberId가 본인 ID인 경우)
			- 타인 조회: `GET /api/members/2` (memberId가 다른 회원 ID인 경우)

			**참고**: 클라이언트는 로그인 시 받은 memberId를 사용하여 본인 정보를 조회할 수 있습니다.
			"""
	)
	@ApiResponses({
		@ApiResponse(
			responseCode = "200",
			description = "조회 성공",
			content = @Content(schema = @Schema(implementation = MemberResponse.class))
		),
		@ApiResponse(
			responseCode = "401",
			description = "인증 실패 (로그인 필요)"
		),
		@ApiResponse(
			responseCode = "404",
			description = "회원을 찾을 수 없음"
		)
	})
	public ResponseEntity<MemberResponse> getMemberInfo(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication
	) {
		// 현재 로그인한 사용자 ID 추출 (로깅/분석용)
		Long currentMemberId = Long.parseLong(authentication.getName());
		log.debug("회원 정보 조회 요청: targetMemberId={}, currentMemberId={}", memberId, currentMemberId);

		MemberResponse response = memberService.getMemberInfo(memberId);

		return ResponseEntity.ok(response);
	}

	/**
	 * 회원 프로필 수정 (본인만 가능)
	 *
	 * @param memberId       수정할 회원 ID
	 * @param authentication Spring Security Authentication (현재 로그인한 사용자)
	 * @param request        프로필 수정 요청
	 * @return 수정된 회원 정보
	 */
	@PutMapping("/{memberId}")
	@Operation(
		summary = "회원 프로필 수정",
		description = """
			회원 프로필 정보를 수정합니다.

			**권한**: 본인만 수정 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**예시**:
			- `PUT /api/members/1` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(
			responseCode = "200",
			description = "수정 성공",
			content = @Content(schema = @Schema(implementation = MemberResponse.class))
		),
		@ApiResponse(
			responseCode = "401",
			description = "인증 실패 (로그인 필요)"
		),
		@ApiResponse(
			responseCode = "403",
			description = "권한 없음 (본인만 수정 가능)"
		),
		@ApiResponse(
			responseCode = "404",
			description = "회원을 찾을 수 없음"
		)
	})
	public ResponseEntity<MemberResponse> updateProfile(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication,
		@Valid @RequestBody MemberProfileUpdateRequest request
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());

		MemberResponse response = memberService.updateProfile(memberId, currentMemberId, request);

		return ResponseEntity.ok(response);
	}

	/**
	 * 회원 탈퇴 (본인만 가능)
	 *
	 * @param memberId       탈퇴할 회원 ID
	 * @param authentication Spring Security Authentication (현재 로그인한 사용자)
	 * @return 성공 메시지
	 */
	@DeleteMapping("/{memberId}")
	@Operation(
		summary = "회원 탈퇴",
		description = """
			회원 탈퇴를 처리합니다.

			**권한**: 본인만 탈퇴 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**예시**:
			- `DELETE /api/members/1` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(
			responseCode = "200",
			description = "탈퇴 성공"
		),
		@ApiResponse(
			responseCode = "401",
			description = "인증 실패 (로그인 필요)"
		),
		@ApiResponse(
			responseCode = "403",
			description = "권한 없음 (본인만 탈퇴 가능)"
		),
		@ApiResponse(
			responseCode = "404",
			description = "회원을 찾을 수 없음"
		)
	})
	public ResponseEntity<String> deleteMember(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());

		memberService.deleteMember(memberId, currentMemberId);

		return ResponseEntity.ok("회원 탈퇴가 완료되었습니다.");
	}
}