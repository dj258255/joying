package com.joying.rental.dto.response;

import com.joying.rental.domain.VideoType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 영상 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoResponse {

    private Long rentalVideoId;
    private Long rentalHisId;
    private VideoType videoType;
    private String videoTypeDescription;  // "대여자 발송 영상"
    private Long fileId;
    private String fileUrl;              // 영상 URL
    private Instant uploadedAt;          // UTC 기준 업로드 시간
}