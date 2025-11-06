package com.joying.chat.controller

import com.joying.chat.dto.FileType
import com.joying.chat.dto.FileUploadResponse
import com.joying.common.response.ApiResponse
import com.joying.file.component.FileUrlResolver
import com.joying.file.service.FileService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

/**
 * 채팅 파일 업로드 Controller
 *
 * 채팅 메시지에 첨부할 파일/이미지 업로드
 * - 기존 FileService 재사용
 * - ContentType에 따라 자동으로 이미지/파일 구분 및 검증
 */
@Tag(name = "Chat File", description = "채팅 파일 업로드 API")
@RestController
@RequestMapping("/api/v1/chat-rooms/{chatRoomId}/upload")
class ChatFileController(
    private val fileService: FileService,
    private val fileUrlResolver: FileUrlResolver
) {
    private val logger = LoggerFactory.getLogger(ChatFileController::class.java)

    /**
     * 파일 업로드 (통합)
     *
     * 이미지, 파일 등 모든 타입의 파일을 업로드합니다.
     * ContentType에 따라 자동으로 검증 기준이 적용됩니다.
     * - 이미지: jpg, jpeg, png, gif, webp (최대 10MB)
     * - 일반 파일: 모든 타입 (최대 50MB)
     *
     * @param chatRoomId 채팅방 ID
     * @param file 업로드할 파일
     * @return 파일 ID와 URL
     */
    @Operation(
        summary = "채팅 파일 업로드",
        description = "채팅 메시지에 첨부할 파일(이미지/문서)을 업로드하고 URL을 반환합니다. ContentType에 따라 자동으로 검증됩니다."
    )
    @PostMapping(consumes = ["multipart/form-data"])
    fun upload(
        @PathVariable chatRoomId: Long,
        @RequestPart("file") file: MultipartFile
    ): ResponseEntity<ApiResponse.SuccessBody<FileUploadResponse>> {
        val memberId = getCurrentMemberId()

        logger.info(
            "파일 업로드 요청: chatRoomId={}, memberId={}, fileName={}, size={}, contentType={}",
            chatRoomId,
            memberId,
            file.originalFilename,
            file.size,
            file.contentType
        )

        // 파일 타입 감지
        val isImage = isImageFile(file)

        // 파일 타입별 검증
        validateFileByType(file, isImage)

        // 파일 저장 (기존 FileService 사용)
        val savedFile = fileService.saveFile(file)

        val response = FileUploadResponse(
            fileId = savedFile.fileId!!,
            url = fileUrlResolver.toPublicUrl(savedFile),
            fileName = file.originalFilename ?: if (isImage) "image" else "file",
            fileSize = file.size,
            fileType = if (isImage) FileType.IMAGE else FileType.FILE
        )

        logger.info("파일 업로드 완료: fileId={}, url={}, type={}", savedFile.fileId, response.url, response.fileType)

        return ApiResponse.ok("파일 업로드 완료", response)
    }

    /**
     * 이미지 파일 여부 확인
     *
     * ContentType을 기반으로 이미지 파일 여부를 판단합니다.
     * 지원 형식: jpg, jpeg, png, gif, webp
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
     * 파일 타입별 검증
     *
     * @param file 검증할 파일
     * @param isImage 이미지 파일 여부
     * @throws IllegalArgumentException 파일 크기가 제한을 초과하는 경우
     */
    private fun validateFileByType(file: MultipartFile, isImage: Boolean) {
        if (isImage) {
            // 이미지 검증 (10MB 제한)
            if (file.size > 10 * 1024 * 1024) {
                throw IllegalArgumentException("이미지 파일 크기는 10MB를 초과할 수 없습니다")
            }
        } else {
            // 일반 파일 검증 (50MB 제한)
            if (file.size > 50 * 1024 * 1024) {
                throw IllegalArgumentException("파일 크기는 50MB를 초과할 수 없습니다")
            }
        }
    }

    /**
     * SecurityContext에서 현재 인증된 사용자 ID 반환
     *
     * JwtAuthenticationFilter가 쿠키에서 JWT 토큰을 추출하고
     * SecurityContext에 인증 정보를 설정합니다.
     *
     * @return 사용자 ID
     * @throws IllegalStateException 인증되지 않은 경우
     */
    private fun getCurrentMemberId(): Long {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw IllegalStateException("인증 정보가 없습니다")

        return authentication.name.toLong()
    }
}