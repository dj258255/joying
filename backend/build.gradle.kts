plugins {
    java
    kotlin("jvm") version "2.1.0"
    kotlin("plugin.spring") version "2.1.0"
    kotlin("plugin.jpa") version "2.1.0"
    kotlin("plugin.lombok") version "2.1.0" // Kotlin에서 Java Lombok 인식용
    kotlin("kapt") version "2.1.0"
    id("org.springframework.boot") version "3.5.6"
    id("io.spring.dependency-management") version "1.1.7"
    id("io.freefair.lombok") version "8.11" // Java Lombok annotation processing용
}

group = "com.joying"
version = "0.0.1-SNAPSHOT"
description = "A community-based equipment rental platform"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

// configurations 제거 - Lombok이 제대로 작동하도록

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-data-elasticsearch")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb") // 채팅 메시지 저장용 (blocking)
    implementation("org.springframework.boot:spring-boot-starter-data-redis") // Redis Pub/Sub (blocking)
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.kafka:spring-kafka")
    implementation("org.springframework.boot:spring-boot-starter-websocket") // WebSocket STOMP

    // Kotlin
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib")

    // Kotlin Coroutines (비동기 처리 - 채팅 기능용)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor:1.9.0") // Spring MVC suspend fun 지원
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")

	// WebClient (외부 API 호출용 - Toss Payments 등)
	implementation("org.springframework.boot:spring-boot-starter-webflux")

	// Resilience4j Circuit Breaker
	implementation("io.github.resilience4j:resilience4j-spring-boot3:2.2.0")
	implementation("io.github.resilience4j:resilience4j-circuitbreaker:2.2.0")

	// Swagger/OpenAPI (Spring Boot 3.5.x 호환)
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.3")

    // MapStruct
    implementation("org.mapstruct:mapstruct:1.6.3")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.6.3")

    // Lombok은 io.freefair.lombok 플러그인이 자동으로 처리

    // Database Drivers
    runtimeOnly("com.mysql:mysql-connector-j")
    testRuntimeOnly("com.h2database:h2")

    // Flyway (Database Migration)
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")

    // Development Tools
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    // developmentOnly("org.springframework.boot:spring-boot-docker-compose") // Docker Compose 미사용으로 주석 처리

    // Test Dependencies
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // Testcontainers (Spring Boot 3.1+ 공식 지원)
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:testcontainers") // Testcontainers BOM 관리
    // Redis 전용 Testcontainer는 없으므로 GenericContainer 사용

    implementation("software.amazon.awssdk:s3:2.28.23")
    implementation("software.amazon.awssdk:auth:2.28.23")
    implementation("software.amazon.awssdk:regions:2.28.23")

    // Elasticsearch Java API Client
    implementation("co.elastic.clients:elasticsearch-java:8.18.5")

    // Web Push (브라우저 푸시 알림)
    implementation("nl.martijndwars:web-push:5.1.1")
    implementation("org.bouncycastle:bcprov-jdk15on:1.70")
}

// Java 소스를 delombok된 소스로 변경
tasks.named<JavaCompile>("compileJava") {
    dependsOn("delombok")
    source = fileTree("build/generated/sources/delombok/java/main")
    options.compilerArgs.addAll(listOf("-parameters"))
}

tasks.named<JavaCompile>("compileTestJava") {
    dependsOn("delombokTest")
}

// Kotlin 컴파일 옵션
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict", "-Xallow-kotlin-package")
        jvmTarget = "17"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()

    // 테스트 실행 시 자동으로 test 프로필 활성화
    systemProperty("spring.profiles.active", "test")

    // 테스트 로그 출력 설정
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = false
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
