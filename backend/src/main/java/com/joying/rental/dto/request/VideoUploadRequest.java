package com.joying.rental.dto.request;

import com.joying.rental.domain.VideoType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영상 업로드 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VideoUploadRequest {

    @NotNull(message = "파일 ID는 필수입니다")
    private Long fileId;

    @NotNull(message = "영상 타입은 필수입니다")
    private VideoType videoType;  // OWNER_SEND, RENTER_RECEIVE, RENTER_RETURN, OWNER_RECEIVE
}