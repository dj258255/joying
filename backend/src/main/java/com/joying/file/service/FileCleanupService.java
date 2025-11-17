package com.joying.file.service;

import com.joying.file.domain.File;
import com.joying.file.repository.FileRepository;
import com.joying.file.repository.ProductFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.Instant;
import java.time.Duration;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileCleanupService {

    private final FileRepository fileRepository;
    private final ProductFileRepository productFileRepository;
    private final S3Client r2s3Client;

    @Value("${cloudflare.r2.bucket}")
    private String bucketName;

    // 일반 파일: 24시간 후 삭제
    @Value("${app.file.cleanup-threshold-hours:24}")
    private long thresholdHours;

    // 채팅 파일: 3개월(90일) 후 삭제
    @Value("${app.file.chat-cleanup-threshold-days:90}")
    private long chatCleanupDays;

    /**
     * 매 시간마다 돌면서 고아 파일 삭제
     * - 일반 파일(상품, 리뷰 등): 24시간 후 삭제
     * - 채팅 파일: 3개월 후 삭제
     */
    @Scheduled(cron = "0 0 * * * *") // 매 정각마다
    public void cleanupOrphanFiles() {

        Instant generalCutoff = Instant.now().minus(Duration.ofHours(thresholdHours));
        Instant chatCutoff = Instant.now().minus(Duration.ofDays(chatCleanupDays));

        // 오래 전에 업로드된 파일 중, 어떤 product_file 관계도 없는 애들
        List<File> orphans = fileRepository.findOrphanFilesBefore(generalCutoff);

        for (File f : orphans) {
            try {
                // R2 object key 구하기
                String objectKey = extractObjectKey(f);

                // 채팅 파일인지 확인 (uploads/YYYY-MM-DD/ 패턴)
                boolean isChatFile = isChatFile(f);

                if (isChatFile) {
                    // 채팅 파일은 3개월 후에만 삭제
                    if (f.getCreatedAt().isAfter(chatCutoff)) {
                        log.debug("[FileCleanup] 채팅 파일은 3개월 보관, 건너뜀: fileId={}", f.getFileId());
                        continue;
                    }
                }

                // S3/R2에서 삭제
                r2s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(objectKey)
                        .build());

                // DB에서 삭제
                fileRepository.delete(f);

                log.info("[FileCleanup] deleted orphan fileId={} key={} type={}",
                    f.getFileId(), objectKey, isChatFile ? "CHAT" : "GENERAL");

            } catch (Exception e) {
                log.warn("[FileCleanup] failed to delete orphan fileId={}", f.getFileId(), e);
            }
        }
    }

    /**
     * 채팅 파일인지 확인 (directory가 "uploads/YYYY-MM-DD" 패턴인 경우)
     */
    private boolean isChatFile(File file) {
        String dir = file.getDirectory();
        if (dir == null) return false;
        // "uploads/2025-11-17" 형식인지 확인
        return dir.matches("^uploads/\\d{4}-\\d{2}-\\d{2}$");
    }

    private String extractObjectKey(File file) {
        // 1순위: metadata.key
        // 2순위: directory + "/" + fileName
        try {
            String meta = file.getMetadata();
            if (meta != null && meta.contains("\"key\"")) {
                // 파싱
                int idx = meta.indexOf("\"key\"");
                if (idx >= 0) {
                    int start = meta.indexOf(":", idx) + 1;
                    int quote1 = meta.indexOf("\"", start);
                    int quote2 = meta.indexOf("\"", quote1 + 1);
                    if (quote1 >= 0 && quote2 > quote1) {
                        return meta.substring(quote1 + 1, quote2);
                    }
                }
            }
        } catch (Exception ignored) {}

        String dir = file.getDirectory();
        String name = file.getFileName();
        if (dir == null || dir.isBlank()) {
            return name;
        }
        return dir.replaceAll("^/+", "").replaceAll("/+$", "") + "/" + name;
    }
}
