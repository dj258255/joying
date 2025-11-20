package com.joying.chat.config

import nl.martijndwars.webpush.PushService
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.security.Security

/**
 * Web Push 설정
 * VAPID 키를 사용하여 푸시 알림을 전송합니다.
 *
 * web-push.enabled=false 이거나 VAPID 키가 없으면 비활성화됩니다.
 */
@Configuration
@ConditionalOnProperty(name = ["web-push.enabled"], havingValue = "true", matchIfMissing = false)
class WebPushConfig {

    @Value("\${web-push.public-key:}")
    private var publicKey: String = ""

    @Value("\${web-push.private-key:}")
    private var privateKey: String = ""

    init {
        // BouncyCastle 프로바이더 등록 (Web Push 암호화에 필요)
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    @Bean
    fun pushService(): PushService? {
        if (publicKey.isBlank() || privateKey.isBlank()) {
            println("[WARNING] VAPID 키가 설정되지 않았습니다. 푸시 알림 기능이 비활성화됩니다.")
            return null
        }

        val pushService = PushService()
        pushService.setPublicKey(publicKey)
        pushService.setPrivateKey(privateKey)
        return pushService
    }

    @Bean
    fun vapidPublicKey(): String = publicKey
}