# 기록

무엇을 고쳤는지가 아니라 **무엇을 보고 그렇게 판단했는지**를 남긴다.

## 기록 규칙

- 평서체(~다)로 쓴다.
- 수치는 잰 조건과 함께 적는다. 조건을 적을 수 없으면 수치를 적지 않는다.
- 재지 않은 것은 재지 않았다고 적는다.
- 고친 것만 해결에 적는다. 고칠 예정은 적지 않는다.

## [리팩터링 기록](refactoring/README.md)

상황 31개. 무엇이 잘못돼 있었고, 무엇을 보고 알았고, 무엇을 고쳤는지를 순서대로 적었다.
끝에 **[아직 하지 않은 것](refactoring/README.md#아직-하지-않은-것)** 이 있다. 못 한 것은
왜 못 하는지와 함께 남긴다.

되풀이되는 것이 둘 있다.

- **재는 자리를 다섯 번 틀렸다** (상황 7 · 11 · 14 · 20 · 29). 재는 쪽이 운영과 다르면
  나오는 값은 운영의 값이 아니다.
- **도구를 붙일 때마다 뭔가 나왔다** (상황 15 · 23 · 26 · 28). 넷 다 새로 생긴 것이 아니라
  원래 있었는데 아무도 안 보던 것이다.

## 골라야 했던 것

| | |
|---|---|
| [저장소를 무엇으로 둘 것인가](decisions/datastore-choice.md) | 네 개를 두 개로 줄인 근거 |
| [검색을 Elasticsearch로 두는 것이 맞는가](decisions/search-engine-choice.md) | 옮기지 않기로 한 이유 |

## 옮긴 것

| | |
|---|---|
| [MySQL 과 MongoDB 를 PostgreSQL 로](migration/postgresql.md) | 옮기기 전에 무엇을 다시 검증해야 하는지 세고 옮겼다 |

## 잰 것

재기 전에는 짐작이었다. 잰 뒤에 판단이 바뀐 것이 여럿 있다.

### 채팅

| | 결과 |
|---|---|
| [받는 순서가 번호 순서와 다르다](performance/message-delivery-order.md) | 단위 테스트 0 → 실부하 67 |
| [서버가 두 대가 되면 순서가 유지되는가](performance/two-node-delivery.md) | 갈라 붙이면 드물게 뒤집힌다 |
| [실제 지형으로 다시 재니 열 배 나빴다](performance/one-to-one-two-node.md) | 4회 → 42~54회 |
| [같은 방의 두 사람을 같은 노드로](performance/room-sticky-routing.md) | 42~54회 → **0회**. 노드 증감·사망·탭 둘도 함께 쟀다 |
| [탭을 둘 열면 엉뚱한 노드로 간다](performance/room-sticky-routing.md#연결-주소에-실어-고쳤다) | 63.3% → **0%** |
| [메시지마다 스레드가 하나씩 생겼다](performance/redis-listener-threads.md) | |
| [답장이 섞이면 목록이 여섯 배 느리다](performance/message-list-nplus1.md) | 60ms → 10ms |

### 결제와 돈

| | 결과 |
|---|---|
| [버튼을 두 번 누르면 결제가 열 건](performance/payment-create-race.md) | 16건 동시 → 10건 생성 |

### 견디는가

| | 결과 |
|---|---|
| [저장소가 느려지거나 끊길 때](performance/fault-injection.md) | 300ms 지연 → 왕복 64초 |
| [무엇을 지켜볼 것인가](performance/observability.md) | 지표는 멀쩡한데 사용자는 59초 대기 |

## 재는 자리

| | |
|---|---|
| [load/k6](../load/k6) | 부하를 넣어 잰다 |
| [load/toxiproxy](../load/toxiproxy) | 저장소를 느리게 하거나 끊는다 |
| [load/routing](../load/routing) | 앞단이 방을 어느 노드로 보내는지 잰다 |

## 배포

배포를 **처음 끝까지 돌려 보니 여섯 군데에서 걸렸다**(상황 28). 첫 인증서를 아무도 만들지
않아 앞단이 뜨지 못하던 것도 있었다(상황 30). 서버 없이 이 기계를 대상으로 돌릴 수 있다.

| | |
|---|---|
| [ansible](../ansible/README.md) | 비밀을 vault 에 두고 서버에서 `.env` 를 만든다. 서버 없이 리허설하는 방법과 첫 인증서를 받는 방법 |
| [infra](../infra/README.md) | 앞단(nginx)과 관측(Prometheus · Grafana) |
