package com.joying.file.service;

import com.joying.file.domain.File;
import org.springframework.web.multipart.MultipartFile;

public interface FileService {
    File saveFile(MultipartFile multipartFile);
}
