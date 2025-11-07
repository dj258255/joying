package com.joying.rental.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 영상 목록 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoListResponse {

    private Long rentalHisId;
    private List<VideoResponse> videos;
    private Integer totalCount;

    // 각 타입별 업로드 여부
    private Boolean hasOwnerSendVideo;
    private Boolean hasRenterReceiveVideo;
    private Boolean hasRenterReturnVideo;
    private Boolean hasOwnerReceiveVideo;
}