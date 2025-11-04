package com.joying.chat.controller

import com.joying.common.config.security.JwtTokenProvider
import com.joying.common.response.ApiResponse
import com.joying.file.component.FileUrlResolver
import com.joying.file.service.FileService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

/**
 * 채팅 파일 업로드 Controller
 *
 * 채팅 메시지에 첨부할 파일/이미지 업로드
 * - 기존 FileService 재사용
 * - 채팅 전용 엔드포인트 제공
 */
@Tag(name = "Chat File", description = "채팅 파일 업로드 API")
@RestController
@RequestMapping("/api/chat-rooms/{chatRoomId}/upload")
class ChatFileController(
    private val fileService: FileService,
    private val fileUrlResolver: FileUrlResolver,
    private val jwtTokenProvider: JwtTokenProvider
) {
    private val logger = LoggerFactory.getLogger(ChatFileController::class.java)

    /**
     * 이미지 업로드
     *
     * @param chatRoomId 채팅방 ID
     * @param file 업로드할 이미지 파일
     * @param authorization JWT 토큰
     * @return 파일 ID와 URL
     */
    @Operation(
        summary = "채팅 이미지 업로드",
        description = "채팅 메시지에 첨부할 이미지를 업로드하고 URL을 반환합니다"
    )
    @PostMapping("/image", consumes = ["multipart/form-data"])
    fun uploadImage(
        @PathVariable chatRoomId: Long,
        @RequestPart("file") file: MultipartFile,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<Map<String, Any>>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info(
            "이미지 업로드 요청: chatRoomId={}, memberId={}, fileName={}, size={}",
            chatRoomId,
            memberId,
            file.originalFilename,
            file.size
        )

        // 파일 타입 검증 (이미지만 허용)
        if (!isImageFile(file)) {
            throw IllegalArgumentException("이미지 파일만 업로드 가능합니다 (jpg, jpeg, png, gif, webp)")
        }

        // 파일 크기 검증 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            throw IllegalArgumentException("파일 크기는 10MB를 초과할 수 없습니다")
        }

        // 파일 저장 (기존 FileService 사용)
        val savedFile = fileService.saveFile(file)

        val response = mapOf(
            "fileId" to savedFile.fileId!!,
            "url" to fileUrlResolver.toPublicUrl(savedFile),
            "fileName" to (file.originalFilename ?: "image"),
            "fileSize" to file.size
        )

        logger.info("이미지 업로드 완료: fileId={}, url={}", savedFile.fileId, response["url"])

        return ApiResponse.ok("이미지 업로드 완료", response)
    }

    /**
     * 파일 업로드
     *
     * @param chatRoomId 채팅방 ID
     * @param file 업로드할 파일
     * @param authorization JWT 토큰
     * @return 파일 ID와 URL
     */
    @Operation(
        summary = "채팅 파일 업로드",
        description = "채팅 메시지에 첨부할 파일을 업로드하고 URL을 반환합니다"
    )
    @PostMapping("/file", consumes = ["multipart/form-data"])
    fun uploadFile(
        @PathVariable chatRoomId: Long,
        @RequestPart("file") file: MultipartFile,
        @RequestHeader("Authorization") authorization: String
    ): ResponseEntity<ApiResponse.SuccessBody<Map<String, Any>>> {
        val memberId = extractMemberIdFromToken(authorization)

        logger.info(
            "파일 업로드 요청: chatRoomId={}, memberId={}, fileName={}, size={}",
            chatRoomId,
            memberId,
            file.originalFilename,
            file.size
        )

        // 파일 크기 검증 (50MB 제한)
        if (file.size > 50 * 1024 * 1024) {
            throw IllegalArgumentException("파일 크기는 50MB를 초과할 수 없습니다")
        }

        // 파일 저장 (기존 FileService 사용)
        val savedFile = fileService.saveFile(file)

        val response = mapOf(
            "fileId" to savedFile.fileId!!,
            "url" to fileUrlResolver.toPublicUrl(savedFile),
            "fileName" to (file.originalFilename ?: "file"),
            "fileSize" to file.size
        )

        logger.info("파일 업로드 완료: fileId={}, url={}", savedFile.fileId, response["url"])

        return ApiResponse.ok("파일 업로드 완료", response)
    }

    /**
     * 이미지 파일 여부 확인
     */
    private fun isImageFile(file: MultipartFile): Boolean {
        val contentType = file.contentType ?: return false
        return contentType.startsWith("image/") &&
                (contentType.contains("jpeg") ||
                        contentType.contains("jpg") ||
                        contentType.contains("png") ||
                        contentType.contains("gif") ||
                        contentType.contains("webp"))
    }

    /**
     * Authorization 헤더에서 JWT 토큰 추출 후 사용자 ID 반환
     */
    private fun extractMemberIdFromToken(authorization: String): Long {
        val token = authorization.replace("Bearer ", "")
        return jwtTokenProvider.getMemberId(token)
    }
}
