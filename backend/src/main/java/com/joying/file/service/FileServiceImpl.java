package com.joying.file.service;

import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final S3Client r2s3Client;
    private final FileRepository fileRepository;

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            // 이미지
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",

            // 영상
            "video/mp4",
            "video/quicktime",   // .mov
            "video/x-msvideo",   // .avi
            "video/webm"
    );

    @Value("${cloudflare.r2.bucket}")
    private String bucketName;

    @Override
    public File saveFile(MultipartFile multipartFile) {

        if (multipartFile == null || multipartFile.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어 있습니다.");
        }

        String contentType = multipartFile.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("허용되지 않은 파일 형식입니다.");
        }

        String originalName = multipartFile.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            originalName = "unnamed";
        }

        String dateFolder = LocalDate.now().toString();
        String directory = "uploads/" + dateFolder;

        String storedFileName = UUID.randomUUID() + "_" + originalName;

        String objectKey = directory + "/" + storedFileName;

        try {
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(multipartFile.getContentType())
                    .build();

            r2s3Client.putObject(
                    putReq,
                    RequestBody.fromBytes(multipartFile.getBytes())
            );
        } catch (Exception e) {
            throw new RuntimeException("파일 R2 업로드 실패: " + e.getMessage(), e);
        }

        String metadataJson = """
                {
                  "originalName": "%s",
                  "size": %d,
                  "contentType": "%s",
                  "key": "%s"
                }
                """.formatted(
                escapeJson(originalName),
                multipartFile.getSize(),
                escapeJson(multipartFile.getContentType()),
                escapeJson(objectKey)
        );

        File entity = File.builder()
                .fileName(storedFileName)
                .directory(directory)
                .metadata(metadataJson)
                .build();

        File saved = fileRepository.save(entity);

        return saved;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"");
    }
}
