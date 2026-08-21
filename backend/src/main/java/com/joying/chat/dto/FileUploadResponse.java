package com.joying.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 파일 업로드 결과.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {

	private Long fileId;
	private String url;
	private String fileName;
	private long fileSize;
	private FileType fileType;
}
