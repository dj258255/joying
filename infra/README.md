# 앞단과 관측

## nginx.conf — 앞단

TLS 를 끊고, 요청 제한을 걸고, 웹소켓을 **방 단위로 같은 노드에 붙인다.**

```nginx
map $cookie_chat_room $chat_room_key {
    ""      $arg_roomId;
    default $cookie_chat_room;
}

upstream chat_backend {
    hash $chat_room_key consistent;
    server joying-backend:8080;
}
```

같은 방의 두 사람이 다른 노드에 붙으면 두 노드가 각자 Redis 에 발행한다. 번호는 증가
연산 하나가 정하므로 유일하지만, 1번이 41번을 발행하는 것과 2번이 42번을 발행하는 것
사이에는 아무 순서가 없다. 재 보니 **400건 중 42~54회** 뒤집혔고, 같은 노드에 붙이면
**0** 이다.

### 열쇠를 두 군데서 찾는 이유

브라우저는 SockJS 를 쓴다. SockJS 가 기본 주소 뒤에 경로를 덧붙이므로 **쿼리스트링이
살아남지 못한다.** 그래서 화면은 쿠키로 알리고, 원시 웹소켓으로 붙는 쪽(부하 실험)은
쿼리스트링을 쓴다. 앞단이 둘 다 읽는다.

### 잰 것

- [방 단위 라우팅](../docs/performance/room-sticky-routing.md) — 뒤집힘 42~54회 → 0회
- 노드를 늘리거나 줄일 때 옮겨 가는 방: `consistent` 30.1% vs 그냥 `hash` 65.8%.
  그보다 **옮겨 간 것이 어디로 갔는지**가 다르다
- 탭을 둘 열어 서로 다른 방을 보면 **69.1%** 가 엉뚱한 노드로 간다. 아직 고치지 않았다

재는 자리는 [load/routing](../load/routing) 에 있다.

### 첫 인증서

`ssl_certificate` 가 가리키는 파일을 못 찾으면 nginx 가 죽는다. compose 의 certbot 은
**갱신만** 하고 최초 발급을 하지 않으므로, 새 서버에서는 앞단이 떠야 인증을 받고 인증을
받아야 앞단이 뜬다.

배포가 자체 서명한 것을 자리에 놓아 그 고리를 끊는다. 앞단이 뜬 뒤
[진짜 인증서를 한 번 받는다](../ansible/README.md#첫-인증서). 그 뒤로는 certbot 이
12시간마다 갱신한다.

## observability — 지켜보는 것

```bash
docker compose -f infra/observability/docker-compose.yml up -d
```

앱과 저장소는 따로 띄운다. 지표를 모으고 보는 것만 여기 있다.

| | |
|---|---|
| `prometheus.yml` | 무엇을 긁어 올지 |
| `grafana/dashboards/chat-slo.json` | 채팅 |
| `grafana/dashboards/payment-slo.json` | 결제 |

**무엇을 지켜볼지 고른 기준과, 만들자마자 찾은 틀린 것**은
[관측 문서](../docs/performance/observability.md)에 있다. 지표가 멀쩡해 보이는데 사용자는
59초를 기다리고 있었다.

### 아직 하지 않은 것

**경보가 없다.** 대시보드만 있다. 임계값을 정하려면 정상 상태의 분포를 알아야 하는데
실 트래픽이 없다.
