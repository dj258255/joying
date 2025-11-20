package com.joying.chat.dto

/**
 * 파일 업로드 Response
 */
data class FileUploadResponse(
    val fileId: Long,
    val url: String,
    val fileName: String,
    val fileSize: Long,
    val fileType: FileType
)

enum class FileType {
    IMAGE,
    FILE
}