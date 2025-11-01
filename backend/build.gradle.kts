plugins {
	java
	kotlin("jvm") version "2.1.0"
	kotlin("plugin.spring") version "2.1.0"
	kotlin("plugin.jpa") version "2.1.0"
	id("org.springframework.boot") version "3.5.6"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.joying"
version = "0.0.1-SNAPSHOT"
description = "A community-based equipment rental platform"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(17)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// Spring Boot Starters
	implementation("org.springframework.boot:spring-boot-starter-data-elasticsearch")
	implementation("org.springframework.boot:spring-boot-starter-data-mongodb") // 채팅 기능용
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
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
	implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor:1.9.0")
	testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")

	// WebClient (Reactive Web Client)
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

	// Lombok (Java 코드용)
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok-mapstruct-binding:0.2.0")

	// Database Drivers
	runtimeOnly("com.mysql:mysql-connector-j")
	testRuntimeOnly("com.h2database:h2")

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
	testImplementation("org.testcontainers:testcontainers")  // Testcontainers BOM 관리
	// Redis 전용 Testcontainer는 없으므로 GenericContainer 사용

	implementation("software.amazon.awssdk:s3:2.28.23")
	implementation("software.amazon.awssdk:auth:2.28.23")
	implementation("software.amazon.awssdk:regions:2.28.23")

}

// Kotlin 컴파일 옵션
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
	kotlinOptions {
		freeCompilerArgs = listOf("-Xjsr305=strict")
		jvmTarget = "17"
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}
