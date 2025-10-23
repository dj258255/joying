package com.joying.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 애플리케이션 전역 에러 코드
 *
 * 에러 코드 네이밍 규칙:
 * - COMMON: C + 3자리 숫자 (C001~C999)
 * - AUTH: A + 3자리 숫자 (A001~A999)
 * - USER: U + 3자리 숫자 (U001~U999)
 * - EQUIPMENT: E + 3자리 숫자 (E001~E999)
 * - RENTAL: R + 3자리 숫자 (R001~R999)
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

	// ========================================
	// Common Errors (C001~C099)
	// ========================================
	INVALID_INPUT_VALUE(400, "C001", "잘못된 입력값입니다"),
	INVALID_TYPE_VALUE(400, "C002", "잘못된 타입입니다"),
	MISSING_REQUEST_PARAMETER(400, "C003", "필수 요청 파라미터가 누락되었습니다"),
	METHOD_NOT_ALLOWED(405, "C004", "지원하지 않는 HTTP 메서드입니다"),
	RESOURCE_NOT_FOUND(404, "C005", "리소스를 찾을 수 없습니다"),
	HANDLE_ACCESS_DENIED(403, "C006", "접근이 거부되었습니다"),
	INTERNAL_SERVER_ERROR(500, "C007", "서버 내부 오류가 발생했습니다"),
	INVALID_JSON_FORMAT(400, "C008", "JSON 형식이 올바르지 않습니다"),

	// ========================================
	// Authentication & Authorization (A001~A099)
	// ========================================
	UNAUTHORIZED(401, "A001", "인증이 필요합니다"),
	INVALID_CREDENTIALS(401, "A002", "아이디 또는 비밀번호가 일치하지 않습니다"),
	INVALID_TOKEN(401, "A003", "유효하지 않은 토큰입니다"),
	EXPIRED_TOKEN(401, "A004", "만료된 토큰입니다"),
	REFRESH_TOKEN_NOT_FOUND(404, "A005", "리프레시 토큰을 찾을 수 없습니다"),
	INVALID_REFRESH_TOKEN(401, "A006", "유효하지 않은 리프레시 토큰입니다"),
	EXPIRED_REFRESH_TOKEN(401, "A007", "만료된 리프레시 토큰입니다"),
	FORBIDDEN(403, "A008", "권한이 없습니다"),

	// ========================================
	// User Domain (U001~U099)
	// ========================================
	USER_NOT_FOUND(404, "U001", "사용자를 찾을 수 없습니다"),
	DUPLICATE_EMAIL(409, "U002", "이미 사용 중인 이메일입니다"),
	DUPLICATE_USERNAME(409, "U003", "이미 사용 중인 사용자명입니다"),
	INVALID_PASSWORD(400, "U004", "비밀번호가 올바르지 않습니다"),
	PASSWORD_NOT_MATCH(400, "U005", "비밀번호가 일치하지 않습니다"),
	USER_ALREADY_DELETED(400, "U006", "이미 삭제된 사용자입니다"),
	USER_SUSPENDED(403, "U007", "정지된 사용자입니다"),

	// ========================================
	// Equipment Domain (E001~E099)
	// ========================================
	EQUIPMENT_NOT_FOUND(404, "E001", "장비를 찾을 수 없습니다"),
	EQUIPMENT_NOT_AVAILABLE(400, "E002", "대여 불가능한 장비입니다"),
	EQUIPMENT_ALREADY_RENTED(409, "E003", "이미 대여 중인 장비입니다"),
	EQUIPMENT_ALREADY_DELETED(400, "E004", "이미 삭제된 장비입니다"),

	// ========================================
	// Rental Domain (R001~R099)
	// ========================================
	RENTAL_NOT_FOUND(404, "R001", "대여 내역을 찾을 수 없습니다"),
	RENTAL_ALREADY_RETURNED(400, "R002", "이미 반납된 대여 내역입니다"),
	RENTAL_ALREADY_CANCELLED(400, "R003", "이미 취소된 대여 내역입니다"),
	RENTAL_PERIOD_INVALID(400, "R004", "대여 기간이 올바르지 않습니다"),
	RENTAL_NOT_AUTHORIZED(403, "R005", "대여 내역에 대한 권한이 없습니다"),

	// ========================================
	// Account Domain (AC001~AC099)
	// ========================================
	ACCOUNT_NOT_FOUND(404, "AC001", "계좌를 찾을 수 없습니다"),
	ACCOUNT_ALREADY_REGISTERED(409, "AC002", "이미 등록된 계좌입니다"),
	ACCOUNT_NOT_VERIFIED(400, "AC003", "인증되지 않은 계좌입니다"),
	ACCOUNT_NOT_USABLE(400, "AC004", "사용 불가능한 계좌입니다"),
	ACCOUNT_NOT_AUTHORIZED(403, "AC005", "계좌에 대한 권한이 없습니다"),

	// ========================================
	// Member Domain (M001~M099)
	// ========================================
	MEMBER_NOT_FOUND(404, "M001", "회원을 찾을 수 없습니다"),
	MEMBER_NOT_OWNER(403, "M002", "해당 회원 정보를 수정/삭제할 권한이 없습니다");

	private final int status;
	private final String code;
	private final String message;
}