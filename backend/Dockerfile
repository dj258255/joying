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

# JVM 메모리 설정 (EC2에서 Backend + AI + DB들과 공유하므로 6GB 할당)
# -Xms: 초기 Heap 크기 (5GB)
# -Xmx: 최대 Heap 크기 (5GB)
# -XX:MaxMetaspaceSize: Metaspace 최대 크기 (512MB)
# -XX:MaxDirectMemorySize: Direct Memory 최대 크기 (512MB)
# -XX:+UseG1GC: G1 Garbage Collector 사용
# -XX:MaxGCPauseMillis: GC 최대 정지 시간 목표 (200ms)
# -XX:+HeapDumpOnOutOfMemoryError: OOM 발생 시 Heap Dump 생성
# -XX:HeapDumpPath: Heap Dump 저장 경로
# -XX:+ExitOnOutOfMemoryError: OOM 발생 시 프로세스 종료 (재시작 유도)
ENTRYPOINT ["java", \
    "-Xms5g", \
    "-Xmx5g", \
    "-XX:MaxMetaspaceSize=512m", \
    "-XX:MaxDirectMemorySize=512m", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=200", \
    "-XX:G1HeapRegionSize=16m", \
    "-XX:+HeapDumpOnOutOfMemoryError", \
    "-XX:HeapDumpPath=/app/logs/heap_dump.hprof", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-jar", "app.jar"]