# 기록

무엇을 고쳤는지가 아니라 **무엇을 보고 그렇게 판단했는지**를 남긴다.

## 기록 규칙

- 평서체(~다)로 쓴다.
- 수치는 잰 조건과 함께 적는다. 조건을 적을 수 없으면 수치를 적지 않는다.
- 재지 않은 것은 재지 않았다고 적는다.
- 고친 것만 해결에 적는다. 고칠 예정은 적지 않는다.

## [리팩터링 기록](refactoring/README.md)

상황 33개. 무엇이 잘못돼 있었고, 무엇을 보고 알았고, 무엇을 고쳤는지를 순서대로 적었다.
끝에 **[아직 하지 않은 것](refactoring/README.md#아직-하지-않은-것)** 이 있다. 못 한 것은
왜 못 하는지와 함께 남긴다.

되풀이되는 것이 둘 있다.

- **재는 자리를 여섯 번 틀렸다** (상황 7 · 11 · 14 · 20 · 29 · 33). 재는 쪽이 운영과
  다르면 나오는 값은 운영의 값이 아니다. 마지막 것은 재는 자리가 아니라 부르는 자리였다.
- **도구를 붙일 때마다 뭔가 나왔다** (상황 15 · 23 · 26 · 28). 넷 다 새로 생긴 것이 아니라
  원래 있었는데 아무도 안 보던 것이다.

## 지금 진행 중

일곱 묶음의 측정이 끝났다. 전부 가설과 판정 기준을 재기 전에 이슈에 박아 두고, 잰 뒤에
바꾸지 않았다.

| 묶음 | 결론 | 결과 |
|---|---|---|
| 순서 복원([#91](https://github.com/dj258255/joying/issues/91)) | 기본은 스티키 유지, 중재는 준비된 대안 | [order-restore-three-ways.md](performance/order-restore-three-ways.md) |
| 저장소 분리 이관([#105](https://github.com/dj258255/joying/issues/105) · [#109](https://github.com/dj258255/joying/issues/109)) | 균형점 1만 행/초, 되돌림 25.5초, 원격 30ms 에서 동기 기각 | [live-storage-split.md](performance/live-storage-split.md) |
| 전달 격리([#111](https://github.com/dj258255/joying/issues/111)) | 느린 수신자는 격리, 민 것은 송신 부하 자체 | [slow-consumer.md](performance/slow-consumer.md) |
| 안읽음 커서 단일([#116](https://github.com/dj258255/joying/issues/116)) | 방 30개 목록 p95 36.8ms 로 카운터 캐시 제거, 멱등 이중 증가(#99) 구조로 소멸 | [unread-cursor-single.md](performance/unread-cursor-single.md) |
| 인바운드 백프레셔([#118](https://github.com/dj258255/joying/issues/118)) | 회원당 토큰 버킷(5건/초)이 폭주 17.5초를 기준선 수준(34ms)으로, 사람은 거절 0 | [inbound-backpressure.md](performance/inbound-backpressure.md) |
| 읽기 전환([#120](https://github.com/dj258255/joying/issues/120)) | 섀도 리드 불일치 0 과 가변 열 재동기화 뒤 방 화면 읽기를 새 DB 로 | [read-switch-shadow.md](performance/read-switch-shadow.md) |
| 쓰기 컷오버([#123](https://github.com/dj258255/joying/issues/123)) | 배리어 473ms 안에서 정본 교대, 전달 1.05배 · 유실 0, 되돌림도 모드 복귀로 | [write-cutover.md](performance/write-cutover.md) |

그 밖에 남은 것은 아래다.

| | |
|---|---|
| 조사에서 나온 결함 | [#98](https://github.com/dj258255/joying/issues/98) 페이징이 조용히 끊김. [#100](https://github.com/dj258255/joying/issues/100) 번호표 축출은 실물 재현 뒤 자가 복구를 넣었다(남는 창은 그 수선에 적음) |
| 측정이 연 후속 | 옛 DB 읽기(검색 · 단건 · 답장 원본)의 이주와 옛 chat_message 걷어 들이기([write-cutover.md](performance/write-cutover.md)의 남은 일) |

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
| [순서 복원 셋(스티키 · 서버 중재 · 보류 버퍼)을 한 지형에서](performance/order-restore-three-ways.md) | 셋 다 지킨다. 분산 이득이 없어 **스티키 유지**, 중재는 준비된 대안 |
| [쉰 명이 한꺼번에 다시 붙을 때](performance/reconnect-herd.md) | 전달 p95 그대로(24ms 대 25ms). **H4 기각** |
| [안읽음을 세는 두 방법](performance/unread-two-ways.md) | 히트 5.8ms 대 집계 18.1ms(3.1배). 캐시의 값이 작다 |
| [대화가 진행되는 동안 저장소를 통째로](performance/live-storage-split.md) | 310만 행 무중단 이관, 유실 0. 균형점은 **1만 행/초**, 배리어 445ms |
| [읽지 않는 수신자 서른 명](performance/slow-consumer.md) | 남의 방을 못 민다(격리 구조). 민 것은 **송신 부하 자체**(10.5배) |
| [메시지마다 스레드가 하나씩 생겼다](performance/redis-listener-threads.md) | |
| [답장이 섞이면 목록이 여섯 배 느리다](performance/message-list-nplus1.md) | 60ms → 10ms |
| [답장이 서로 다른 것을 가리킬 때](performance/message-list-nplus1.md) | 모아 와도 25~40% 느리다 |

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
않아 앞단이 뜨지 못하던 것도 있었다(상황 30). 떴다고 채팅이 되는 것은 아니어서 배포가
STOMP 연결까지 확인하고(상황 32), 그 확인이 남의 앱을 보던 것도 잡았다(상황 33).
서버 없이 이 기계를 대상으로 돌릴 수 있다.

| | |
|---|---|
| [ansible](../ansible/README.md) | 비밀을 vault 에 두고 서버에서 `.env` 를 만든다. 서버 없이 리허설하는 방법과 첫 인증서를 받는 방법 |
| [infra](../infra/README.md) | 앞단(nginx)과 관측(Prometheus · Grafana) |
