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
      -p 8475:8474 -p 25432:25432 -p 16381:16381 \
      ghcr.io/shopify/toxiproxy:2.11.0 >/dev/null
    sleep 3
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"postgres","listen":"0.0.0.0:25432","upstream":"joying-postgres:5432","enabled":true}' >/dev/null
    curl -sf -X POST "$API/proxies" \
      -d '{"name":"redis","listen":"0.0.0.0:16381","upstream":"joying-redis:6379","enabled":true}' >/dev/null
    echo "프록시 준비됨. POSTGRES_PORT=25432 REDIS_PORT=16381 로 앱을 띄워라"
    ;;

  latency)
    MS=${2:-300}
    curl -sf -X POST "$API/proxies/postgres/toxics" \
      -d "{\"name\":\"db_latency\",\"type\":\"latency\",\"stream\":\"downstream\",\"attributes\":{\"latency\":$MS,\"jitter\":100}}" >/dev/null
    echo "저장소 응답에 ${MS}ms(±100) 지연을 넣었다"
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
