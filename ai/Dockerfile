# AI 서버 Dockerfile
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 서버 실행
# Uvicorn 워커 설정 (리소스 절약)
# --workers: 워커 프로세스 수 (2개 - 4 vCPU 기준)
# --limit-concurrency: 동시 처리 요청 수 제한 (100개)
# --timeout-keep-alive: Keep-Alive 타임아웃 (30초)
# --timeout-graceful-shutdown: Graceful Shutdown 타임아웃 (30초)
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--limit-concurrency", "100", \
     "--timeout-keep-alive", "30", \
     "--timeout-graceful-shutdown", "30", \
     "--log-level", "info"]
