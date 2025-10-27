package com.joying.file.controller;

import com.joying.common.exception.ErrorResponse;
import com.joying.common.response.ApiResponse;
import com.joying.file.component.FileUrlResolver;
import com.joying.file.domain.File;
import com.joying.file.service.FileService;
import com.joying.member.domain.Member;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileUrlResolver fileUrlResolver;
    private final FileService fileService;

    @Operation(summary = "파일 업로드", description = "이미지/파일을 업로드하고 fileId를 반환합니다.")
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> uploadFile(
            @RequestPart("file") MultipartFile multipartFile,
            @AuthenticationPrincipal Member member
    ) {
        try {
            if (member == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ErrorResponse.of(
                                401,
                                "UNAUTHORIZED",
                                "로그인이 필요합니다."
                        ));
            }

            File saved = fileService.saveFile(multipartFile);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok(
                            Map.of(
                                    "fileId", saved.getFileId(),
                                    "url", fileUrlResolver.toPublicUrl(saved)
                            )
                    ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of(
                            400,
                            "INVALID_FILE",
                            e.getMessage() != null ? e.getMessage() : "유효하지 않은 파일입니다."
                    ));
        } catch (Exception e) {
            log.error("[uploadFile] 서버 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(
                            500,
                            "INTERNAL_SERVER_ERROR",
                            "파일 업로드 중 서버 오류가 발생했습니다."
                    ));
        }
    }
}
