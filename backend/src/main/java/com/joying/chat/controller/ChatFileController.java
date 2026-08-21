package com.joying.chat.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.joying.chat.dto.FileType;
import com.joying.chat.dto.FileUploadResponse;
import com.joying.common.response.ApiResponse;
import com.joying.file.domain.File;
import com.joying.file.service.FileService;
import com.joying.file.component.FileUrlResolver;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 채팅에 붙일 파일을 올린다.
 *
 * <p>이미지와 그 밖의 파일은 크기 상한이 다르다. 무엇인지는 보낸 콘텐츠 타입으로
 * 가린다.
 */
@Tag(name = "Chat File", description = "채팅 파일 업로드 API")
@RestController
@RequestMapping("/api/v1/chat-rooms/{chatRoomId}/upload")
@RequiredArgsConstructor
public class ChatFileController {

	private static final Logger log = LoggerFactory.getLogger(ChatFileController.class);

	private static final long IMAGE_SIZE_LIMIT = 10L * 1024 * 1024;
	private static final long FILE_SIZE_LIMIT = 50L * 1024 * 1024;

	private final FileService fileService;
	private final FileUrlResolver fileUrlResolver;

	@Operation(summary = "채팅 파일 업로드",
		description = "채팅 메시지에 첨부할 파일을 올리고 주소를 돌려준다. 콘텐츠 타입에 따라 검증 기준이 달라진다.")
	@PostMapping(consumes = "multipart/form-data")
	public ResponseEntity<ApiResponse.SuccessBody<FileUploadResponse>> upload(
		@PathVariable Long chatRoomId, @RequestPart("file") MultipartFile file) {

		Long memberId = CurrentMember.id();

		log.info("파일 업로드 요청: chatRoomId={}, memberId={}, fileName={}, size={}, contentType={}",
			chatRoomId, memberId, file.getOriginalFilename(), file.getSize(), file.getContentType());

		boolean isImage = isImageFile(file);
		validateSize(file, isImage);

		File savedFile = fileService.saveFile(file);

		String fileName = file.getOriginalFilename();
		if (fileName == null) {
			fileName = isImage ? "image" : "file";
		}

		FileUploadResponse response = FileUploadResponse.builder()
			.fileId(savedFile.getFileId())
			.url(fileUrlResolver.toPublicUrl(savedFile))
			.fileName(fileName)
			.fileSize(file.getSize())
			.fileType(isImage ? FileType.IMAGE : FileType.FILE)
			.build();

		log.info("파일 업로드 완료: fileId={}, type={}", savedFile.getFileId(), response.getFileType());
		return ApiResponse.ok("파일 업로드 완료", response);
	}

	private boolean isImageFile(MultipartFile file) {
		String contentType = file.getContentType();
		if (contentType == null || !contentType.startsWith("image/")) {
			return false;
		}
		return contentType.contains("jpeg") || contentType.contains("jpg")
			|| contentType.contains("png") || contentType.contains("gif")
			|| contentType.contains("webp");
	}

	private void validateSize(MultipartFile file, boolean isImage) {
		if (isImage && file.getSize() > IMAGE_SIZE_LIMIT) {
			throw new IllegalArgumentException("이미지 파일 크기는 10MB를 초과할 수 없습니다");
		}
		if (!isImage && file.getSize() > FILE_SIZE_LIMIT) {
			throw new IllegalArgumentException("파일 크기는 50MB를 초과할 수 없습니다");
		}
	}
}
