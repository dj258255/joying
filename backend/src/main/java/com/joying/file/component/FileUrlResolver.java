package com.joying.file.component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.joying.file.domain.File;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class FileUrlResolver {

    private final ObjectMapper objectMapper;

    @Value("${app.file.public-base-url}")
    private String publicBaseUrl;

    public String toPublicUrl(File file) {
        if (file == null) return null;

        String meta = file.getMetadata();
        if (StringUtils.hasText(meta)) {
            try {
                JsonNode node = objectMapper.readTree(meta);

                if (node.hasNonNull("fullUrl")) {
                    return node.get("fullUrl").asText();
                }

                if (node.hasNonNull("key")) {
                    String key = trimSlashes(node.get("key").asText());
                    return join(publicBaseUrl, key);
                }
            } catch (Exception ignored) {}
        }

        // 2) 기본 규칙: baseUrl / directory / fileName
        String dir = trimSlashes(file.getDirectory());
        String name = trimSlashes(file.getFileName());

        if (StringUtils.hasText(dir)) {
            return join(publicBaseUrl, dir, name);
        }
        return join(publicBaseUrl, name);
    }

    private static String trimSlashes(String s) {
        if (s == null) return "";
        return s.replaceAll("^/+", "").replaceAll("/+$", "");
    }

    private static String join(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!StringUtils.hasText(p)) continue;
            if (sb.length() > 0 && sb.charAt(sb.length()-1) != '/') sb.append('/');
            sb.append(trimSlashes(p));
        }
        return sb.toString();
    }
}