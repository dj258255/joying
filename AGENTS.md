# 에이전트 작업 규약

코딩 에이전트가 이 저장소에서 작업할 때 지킬 것들이다. 사람의 작업 흐름은
[CONTRIBUTING.md](CONTRIBUTING.md), 기록 문장 규칙은 [docs/README.md](docs/README.md).

## 명령

```bash
# 백엔드 빌드 · 테스트 (Java 17, Spring Boot 3.5)
cd backend && ./gradlew test

# 로컬 기동 (기본값 없는 환경변수가 필요하다. .env.example 참고)
docker compose up -d postgres redis
cd backend && ./gradlew bootRun

# 부하 측정 하네스
load/run-order-modes.sh        # 순서 복원 비교
load/run-unread-two-ways.sh    # 안읽음 두 방식
load/toxiproxy/setup.sh up     # 지연 · 대역폭 주입 프록시
```

## 경계

- **판정 기준을 바꾸지 않는다.** 실험 이슈에 고정된 가설 · 판정 기준은 결과가
  어떻게 나와도 원문대로 판정한다. 기준을 바꿔야 하면 사람에게 묻는다
- **실측하지 않은 수치를 쓰지 않는다.** 문서 · 주석 · PR 의 모든 수치는 실행
  로그나 CSV 원자료가 있어야 한다. "구현했습니다"는 검증의 증거가 아니다
- **완료와 성공을 분리한다.** 결과 파일이 생기면 완료, 수용 검사와 테스트
  재실행을 통과해야 성공이다
- 측정 결과가 0 이면 조건이 섰다는 증거부터 확인한다(수신 0 과 "재지 않음"은
  다르다)
- 이슈 · PR · 커밋 · 문서에 특정 회사를 겨냥한 표현을 쓰지 않는다. 동기는
  기술로만 적고, 기술 블로그 인용은 출처와 함께 쓴다

## 자리

| 무엇 | 어디 |
|---|---|
| 채팅 전달 경로 | `backend/src/main/java/com/joying/chat/` |
| 순서 중재 · 번호 발급 | `chat/service/RoomOrderArbiter.java`, `MessageSequenceGenerator.java` |
| 저장소 분리 이관 | `chat/migration/`, `scripts/*-chat-split.sh` |
| 부하 스크립트 | `load/k6/`, 읽지 않는 클라이언트는 `load/clients/` |
| 측정 결과 원자료 | `load/results/` (CSV, 커밋 대상) |
| 실험 문서 | `docs/performance/` |
