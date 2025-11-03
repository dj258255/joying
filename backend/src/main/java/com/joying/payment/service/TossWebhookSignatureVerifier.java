package com.joying.payment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * 토스 페이먼츠 웹훅 서명 검증기
 *
 * HMAC-SHA256 알고리즘을 사용하여 웹훅 요청이 토스에서 온 것인지 확인
 */
@Slf4j
@Component
public class TossWebhookSignatureVerifier {

    @Value("${toss.secret-key}")
    private String secretKey;

    /**
     * 웹훅 서명 검증
     *
     * @param requestSignature 요청 헤더의 서명 (X-Toss-Signature 또는 toss-signature)
     * @param requestBody      요청 본문 (JSON 문자열)
     * @return 서명이 유효하면 true, 아니면 false
     */
    public boolean verify(String requestSignature, String requestBody) {
        if (requestSignature == null || requestBody == null) {
            log.warn("[Webhook] 서명 또는 본문이 null: signature={}, body={}",
                    requestSignature != null, requestBody != null);
            return false;
        }

        try {
            // 1. 요청 본문으로 HMAC-SHA256 서명 생성
            String calculatedSignature = calculateHmacSha256(requestBody, secretKey);

            // 2. 계산된 서명과 요청 서명 비교
            boolean isValid = calculatedSignature.equals(requestSignature);

            if (isValid) {
                log.info("[Webhook] 서명 검증 성공");
            } else {
                log.warn("[Webhook] 서명 검증 실패: expected={}, actual={}",
                        calculatedSignature.substring(0, 10) + "...",
                        requestSignature.substring(0, 10) + "...");
            }

            return isValid;

        } catch (Exception e) {
            log.error("[Webhook] 서명 검증 중 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * HMAC-SHA256 서명 계산
     *
     * @param data   서명할 데이터
     * @param secret 비밀 키
     * @return Base64로 인코딩된 서명
     */
    private String calculateHmacSha256(String data, String secret) throws NoSuchAlgorithmException, InvalidKeyException {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
        sha256Hmac.init(secretKeySpec);

        byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(hash);
    }
}
