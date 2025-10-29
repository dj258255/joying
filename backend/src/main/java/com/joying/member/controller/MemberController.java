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
 * - GET    /api/v1/members/{memberId}    회원 정보 조회
 * - PUT    /api/v1/members/{memberId}    회원 정보 수정 (본인만)
 * - DELETE /api/v1/members/{memberId}    회원 탈퇴 (본인만)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/members")
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
			- 본인 조회: `GET /api/v1/members/1` (memberId가 본인 ID인 경우)
			- 타인 조회: `GET /api/v1/members/2` (memberId가 다른 회원 ID인 경우)

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
			- `PUT /api/v1/members/1` (토큰의 memberId가 1인 경우만 성공)
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
			- `DELETE /api/v1/members/1` (토큰의 memberId가 1인 경우만 성공)
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

	/**
	 * 프로필 이미지 업로드 (본인만 가능)
	 *
	 * @param memberId       회원 ID
	 * @param authentication Spring Security Authentication (현재 로그인한 사용자)
	 * @param file           업로드할 이미지 파일
	 * @return 수정된 회원 정보
	 */
	@PutMapping(value = "/{memberId}/profile-image", consumes = "multipart/form-data")
	@Operation(
		summary = "프로필 이미지 업로드/변경",
		description = """
			프로필 이미지를 업로드하거나 변경합니다.

			**권한**: 본인만 수정 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**허용 파일 형식**:
			- image/png
			- image/jpeg
			- image/jpg
			- image/gif

			**최대 파일 크기**: 10MB

			**처리 과정**:
			1. 이미지 파일을 Cloudflare R2에 업로드
			2. File 엔티티 생성 및 저장
			3. 회원의 프로필 이미지 변경
			4. Public URL과 함께 회원 정보 반환

			**예시**:
			- `PUT /api/v1/members/1/profile-image` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(
			responseCode = "200",
			description = "업로드 성공",
			content = @Content(schema = @Schema(implementation = MemberResponse.class))
		),
		@ApiResponse(
			responseCode = "400",
			description = "잘못된 파일 형식 또는 파일 크기 초과"
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
	public ResponseEntity<MemberResponse> uploadProfileImage(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication,
		@Parameter(description = "업로드할 이미지 파일", required = true)
		@RequestPart("file") org.springframework.web.multipart.MultipartFile file
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());
		log.debug("프로필 이미지 업로드 요청: memberId={}, currentMemberId={}, fileName={}",
			memberId, currentMemberId, file.getOriginalFilename());

		MemberResponse response = memberService.uploadProfileImage(memberId, currentMemberId, file);

		return ResponseEntity.ok(response);
	}

	/**
	 * 프로필 이미지 완전 삭제 (본인만 가능)
	 *
	 * @param memberId       회원 ID
	 * @param authentication Spring Security Authentication (현재 로그인한 사용자)
	 * @return 수정된 회원 정보 (기본 이미지로 완전 복원됨)
	 */
	@DeleteMapping("/{memberId}/profile-image")
	@Operation(
		summary = "프로필 이미지 완전 삭제",
		description = """
			프로필 이미지를 완전히 삭제하고 기본 이미지로 복원합니다.

			**권한**: 본인만 삭제 가능
			- URL의 memberId와 토큰의 memberId가 일치해야 함

			**처리 과정**:
			1. 사용자 업로드 이미지(profileImage) → null
			2. 카카오 프로필 이미지 URL(kakaoProfileImageUrl) → null
			3. 기본 이미지 URL(`/images/default_profile_image.png`)로 완전 복원
			4. 회원 정보 반환

			**참고**:
			- Cloudflare R2에 업로드된 파일은 삭제되지 않음 (추후 정리 작업으로 처리)
			- 회원 정보에서만 연결이 해제됨
			- 카카오 프로필 이미지 URL도 함께 삭제되어 기본 이미지만 사용

			**예시**:
			- `DELETE /api/v1/members/1/profile-image` (토큰의 memberId가 1인 경우만 성공)
			"""
	)
	@ApiResponses({
		@ApiResponse(
			responseCode = "200",
			description = "삭제 성공 (기본 이미지로 복원)",
			content = @Content(schema = @Schema(implementation = MemberResponse.class))
		),
		@ApiResponse(
			responseCode = "401",
			description = "인증 실패 (로그인 필요)"
		),
		@ApiResponse(
			responseCode = "403",
			description = "권한 없음 (본인만 삭제 가능)"
		),
		@ApiResponse(
			responseCode = "404",
			description = "회원을 찾을 수 없음"
		)
	})
	public ResponseEntity<MemberResponse> deleteProfileImage(
		@Parameter(description = "회원 ID", required = true, example = "1")
		@PathVariable Long memberId,
		Authentication authentication
	) {
		Long currentMemberId = Long.parseLong(authentication.getName());
		log.debug("프로필 이미지 삭제 요청: memberId={}, currentMemberId={}", memberId, currentMemberId);

		MemberResponse response = memberService.deleteProfileImage(memberId, currentMemberId);

		return ResponseEntity.ok(response);
	}
}