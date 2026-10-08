#!/usr/bin/env bash
#
# 저장소를 Toxiproxy 뒤에 놓는다. 지연과 끊김을 주입해 보기 위해서다.
#
# 앱은 프록시 포트를 보고 뜬다.
#   POSTGRES_PORT=25432 REDIS_PORT=16381 ./gradlew bootRun
#
# 사용:
#   load/toxiproxy/setup.sh up          프록시를 만든다
#   load/toxiproxy/setup.sh latency 300 저장소 응답을 300ms 늦춘다
#   load/toxiproxy/setup.sh reset 0.3   저장소 연결을 30% 확률로 끊는다
#   load/toxiproxy/setup.sh redis-down  레디스를 끊는다
#   load/toxiproxy/setup.sh slow-ws 8    느린 수신자 프록시(38080)의 내려받기를 8KB/s 로 조인다 (#111)
#   load/toxiproxy/setup.sh chat-latency 30
#                                        분리 이관의 대상 DB(채팅 전용)를 30ms 늦춘다 (#109)
#                                        지터 없음: 균형점 측정은 고정 지연으로 잰다
#   load/toxiproxy/setup.sh clear       주입한 것을 전부 걷는다
#   load/toxiproxy/setup.sh down        프록시를 내린다
#
set -euo pipefail

API=${TOXIPROXY_API:-http://localhost:8475}
NAME=joying-toxiproxy

case "${1:-}" in
  up)
    # 앱과 저장소가 같은 도커 네트워크에 있어야 프록시가 저장소에 닿는다
    NET=$(docker inspect joying-postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    docker run -d --name "$NAME" --network "$NET" \
      -p 8475:8474 -p 25432:25432 -p 16381:16381 -p 35432:35432 -p 38080:38080 \
      ghcr.io/shopify/toxiproxy:2.11.0 >/dev/null
    sleep 3
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"postgres","listen":"0.0.0.0:25432","upstream":"joying-postgres:5432","enabled":true}' >/dev/null
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"redis","listen":"0.0.0.0:16381","upstream":"joying-redis:6379","enabled":true}' >/dev/null
    # 느린 수신자 실험용. 호스트에서 도는 백엔드(8080)로 올라간다
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"slow-ws","listen":"0.0.0.0:38080","upstream":"host.docker.internal:8080","enabled":true}' >/dev/null 2>&1 || true
    # 분리 이관의 대상 DB. chat-split 프로파일이 떠 있을 때만 쓰인다
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"chat-pg","listen":"0.0.0.0:35432","upstream":"joying-chat-postgres:5432","enabled":true}' >/dev/null 2>&1 || true
    echo "프록시 준비됨. POSTGRES_PORT=25432 REDIS_PORT=16381 로 앱을 띄워라"
    echo "분리 이관 대상 DB 는 35432 를 거친다 (CHAT_MIGRATION_TARGET_URL, DST_URI)"
    ;;

  latency)
    MS=${2:-300}
    curl -sf -X POST "$API/proxies/postgres/toxics" \
      -d "{\"name\":\"db_latency\",\"type\":\"latency\",\"stream\":\"downstream\",\"attributes\":{\"latency\":$MS,\"jitter\":100}}" >/dev/null
    echo "저장소 응답에 ${MS}ms(±100) 지연을 넣었다"
    ;;

  slow-ws)
    KBPS=${2:-8}
    RATE=$((KBPS))
    curl -sf -X DELETE "$API/proxies/slow-ws/toxics/slow_bw" >/dev/null 2>&1 || true
    curl -sf -X POST "$API/proxies/slow-ws/toxics" \
      -d "{\"name\":\"slow_bw\",\"type\":\"bandwidth\",\"stream\":\"downstream\",\"attributes\":{\"rate\":$RATE}}" >/dev/null
    echo "느린 수신자 프록시(38080)의 내려받기를 ${KBPS}KB/s 로 조였다"
    ;;

  chat-latency)
    MS=${2:-30}
    curl -sf -X DELETE "$API/proxies/chat-pg/toxics/chat_latency" >/dev/null 2>&1 || true
    curl -sf -X POST "$API/proxies/chat-pg/toxics" \
      -d "{\"name\":\"chat_latency\",\"type\":\"latency\",\"stream\":\"downstream\",\"attributes\":{\"latency\":$MS,\"jitter\":0}}" >/dev/null
    echo "분리 이관 대상 DB 에 ${MS}ms(지터 0) 지연을 넣었다"
    ;;

  reset)
    RATE=${2:-0.3}
    curl -sf -X POST "$API/proxies/postgres/toxics" \
      -d "{\"name\":\"db_reset\",\"type\":\"reset_peer\",\"stream\":\"downstream\",\"toxicity\":$RATE,\"attributes\":{\"timeout\":0}}" >/dev/null
    echo "저장소 연결을 ${RATE} 확률로 끊는다"
    ;;

  redis-down)
    curl -sf -X POST "$API/proxies/redis/toxics" \
      -d '{"name":"redis_down","type":"timeout","stream":"downstream","attributes":{"timeout":1}}' >/dev/null
    echo "레디스를 끊었다"
    ;;

  clear)
    for proxy in postgres redis; do
      for toxic in $(curl -sf "$API/proxies/$proxy" | python3 -c \
          'import json,sys; print(" ".join(t["name"] for t in json.load(sys.stdin)["toxics"]))'); do
        curl -sf -X DELETE "$API/proxies/$proxy/toxics/$toxic" >/dev/null
        echo "걷음: $proxy/$toxic"
      done
    done
    ;;

  down)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    echo "프록시를 내렸다"
    ;;

  *)
    sed -n '2,20p' "$0"
    exit 1
    ;;
esac
