package com.joying.payment.adapter.toss;

import com.joying.payment.dto.request.TossCancelRequest;
import com.joying.payment.dto.request.TossConfirmRequest;
import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.exception.TossPaymentException;
import com.joying.payment.port.TossPaymentsClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Toss Payments API 클라이언트 구현체
 * - 에러 핸들링 (4xx, 5xx)
 * - 타임아웃 처리
 * - 로깅
 */
@Slf4j
@Profile({"prod","local"})
@Component
@RequiredArgsConstructor
public class TossPaymentsClientImpl implements TossPaymentsClient {

    private final WebClient tossWebClient;
    @Value("${toss.secret-key}") private String secretKey;

    /**
     * 결제 승인 API
     * @throws TossPaymentException 토스 API 에러
     */
    @Override
    @CircuitBreaker(name = "tossPayments", fallbackMethod = "confirmFallback")
    public TossConfirmResponse confirm(String paymentKey, String orderId, int amount) {
        log.info("[Toss API] 결제 승인 요청: paymentKey={}, orderId={}, amount={}", paymentKey, orderId, amount);

        try {
            TossConfirmResponse response = tossWebClient.post()
                    .uri("/v1/payments/confirm")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + basic(secretKey + ":"))
                    .bodyValue(new TossConfirmRequest(paymentKey, orderId, amount))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("[Toss API] 4xx 에러: {}", errorBody);
                                        return Mono.error(new TossPaymentException("CLIENT_ERROR", errorBody));
                                    })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("[Toss API] 5xx 에러: {}", errorBody);
                                        return Mono.error(new TossPaymentException("SERVER_ERROR", errorBody));
                                    })
                    )
                    .bodyToMono(TossConfirmResponse.class)
                    .block();

            log.info("[Toss API] 결제 승인 성공: paymentKey={}, status={}", paymentKey, response.getStatus());
            return response;

        } catch (WebClientResponseException e) {
            log.error("[Toss API] 결제 승인 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TossPaymentException("TOSS_API_ERROR", e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[Toss API] 결제 승인 예외: {}", e.getMessage(), e);
            throw new TossPaymentException("TOSS_API_ERROR", e.getMessage(), e);
        }
    }

    /**
     * 결제 취소 API
     * @throws TossPaymentException 토스 API 에러
     */
    @Override
    @CircuitBreaker(name = "tossPayments", fallbackMethod = "cancelFallback")
    public TossCancelResponse cancel(String paymentKey, String reason) {
        log.info("[Toss API] 결제 취소 요청: paymentKey={}, reason={}", paymentKey, reason);

        try {
            TossCancelResponse response = tossWebClient.post()
                    .uri("/v1/payments/{paymentKey}/cancel", paymentKey)
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + basic(secretKey + ":"))
                    .bodyValue(new TossCancelRequest(reason))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("[Toss API] 4xx 에러: {}", errorBody);
                                        return Mono.error(new TossPaymentException("CLIENT_ERROR", errorBody));
                                    })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("[Toss API] 5xx 에러: {}", errorBody);
                                        return Mono.error(new TossPaymentException("SERVER_ERROR", errorBody));
                                    })
                    )
                    .bodyToMono(TossCancelResponse.class)
                    .block();

            log.info("[Toss API] 결제 취소 성공: paymentKey={}, status={}", paymentKey, response.getStatus());
            return response;

        } catch (WebClientResponseException e) {
            log.error("[Toss API] 결제 취소 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TossPaymentException("TOSS_API_ERROR", e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[Toss API] 결제 취소 예외: {}", e.getMessage(), e);
            throw new TossPaymentException("TOSS_API_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Base64 인코딩 (Basic Auth)
     */
    private String basic(String s) {
        return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 결제 승인 Fallback (Circuit Breaker Open 시)
     */
    private TossConfirmResponse confirmFallback(String paymentKey, String orderId, int amount, Exception ex) {
        log.error("[Toss API] Circuit Breaker OPEN - 결제 승인 실패: orderId={}, error={}", orderId, ex.getMessage());
        throw new TossPaymentException("CIRCUIT_BREAKER_OPEN",
            "토스 결제 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.", ex);
    }

    /**
     * 결제 취소 Fallback (Circuit Breaker Open 시)
     */
    private TossCancelResponse cancelFallback(String paymentKey, String reason, Exception ex) {
        log.error("[Toss API] Circuit Breaker OPEN - 결제 취소 실패: paymentKey={}, error={}", paymentKey, ex.getMessage());
        throw new TossPaymentException("CIRCUIT_BREAKER_OPEN",
            "토스 결제 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.", ex);
    }
}
