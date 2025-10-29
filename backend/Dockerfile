# 1) build stage
FROM gradle:8.7-jdk17 AS builder
WORKDIR /app
COPY backend /app
RUN gradle clean bootJar -x test

# 2) run stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]