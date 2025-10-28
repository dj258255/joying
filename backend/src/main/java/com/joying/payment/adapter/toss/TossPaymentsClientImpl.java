package com.joying.payment.adapter.toss;

import com.joying.payment.dto.request.TossCancelRequest;
import com.joying.payment.dto.request.TossConfirmRequest;
import com.joying.payment.dto.response.TossCancelResponse;
import com.joying.payment.dto.response.TossConfirmResponse;
import com.joying.payment.port.TossPaymentsClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Profile({"prod","local"})
@Component
@RequiredArgsConstructor
public class TossPaymentsClientImpl implements TossPaymentsClient {

    private final WebClient tossWebClient;
    @Value("${toss.secret-key}") private String secretKey;

    @Override
    public TossConfirmResponse confirm(String paymentKey, String orderId, int amount) {
        return tossWebClient.post()
                .uri("/v1/payments/confirm")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basic(secretKey + ":"))
                .bodyValue(new TossConfirmRequest(paymentKey, orderId, amount))
                .retrieve()
                .bodyToMono(TossConfirmResponse.class)
                .block();
    }

    @Override
    public TossCancelResponse cancel(String paymentKey, String reason) {
        return tossWebClient.post()
                .uri("/v1/payments/{paymentKey}/cancel", paymentKey)
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basic(secretKey + ":"))
                .bodyValue(new TossCancelRequest(reason))
                .retrieve()
                .bodyToMono(TossCancelResponse.class)
                .block();
    }

    private String basic(String s) {
        return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }
}

