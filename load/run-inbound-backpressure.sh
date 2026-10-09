#!/usr/bin/env bash
#
# 인바운드 백프레셔의 효과를 잰다 (#118).
#
# slow-consumer(#111)가 밝힌 진범(서른 방 동시 송신이 다른 방 전달 p95 를 10.5배 밂)을
# 회원당 송신 속도 제한이 막는지, 사람 속도의 대화는 안 걸리는지를 본다.
#
# 서버의 제한은 이 스크립트가 바꾸지 않는다. JOYING_CHAT_INBOUND_RATE_PER_SECOND 로
# 띄운 서버에 대고 조건 이름만 맞춰 기록한다.
#
#   기준선 · H9:  load/run-inbound-backpressure.sh baseline <tag>
#   폭주:         load/run-inbound-backpressure.sh flood <tag>
#
# 전제: load/seed/seed-order-rooms.sh 60 (피해자 방 9401~, 먹이 방 9421~9450)
#
# 거절은 서버 지표(chat_message_send_rejected_total)의 전후 차이로 세고, 실제로
# 저장이 줄었는지는 먹이 방의 행 수 전후 차이로 함께 확인한다. 거절 지표만 보면
# "거절했는데 저장도 됐다"를 못 가린다.
set -euo pipefail

COND="${1:?baseline 또는 flood}"
TAG="${2:-1}"
API="${API1:-http://localhost:8080}"
PG="${PG_CONTAINER:-joying-postgres}"
VICTIM_PAIRS=5
FEEDERS=30
FEED_COUNT=1200

cd "$(dirname "$0")/.."
mkdir -p load/results

psqlc() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U joying -d project_db -tA "$@"; }
rejected() {
  # 지표에 application 라벨이 붙으므로 접두사로 맞춘다
  curl -s "$API/actuator/prometheus" \
    | awk '$1 ~ /^chat_message_send_rejected_total/ {print int($2)}'
}

echo "== 시작 조건: $(uptime | sed 's/.*load/load/')"
REJ0=$(rejected); REJ0=${REJ0:-0}
SAVED0=$(psqlc -c "SELECT count(*) FROM chat_message WHERE chat_room_id BETWEEN 9421 AND 9450")

FEED_PID=""
RECV_PID=""
if [ "$COND" = "flood" ]; then
  echo "== 먹이 ${FEEDERS}방 × ${FEED_COUNT}건(30ms 간격) + 정상 수신 ${FEEDERS}명 시작"
  ROLE=receivers SLOW_BASE=ws://localhost:8080 SLOW_COUNT=${FEEDERS} OBSERVE_MS=45000 \
    k6 run --quiet --summary-export "load/results/backpressure-recv-${COND}-${TAG}.json" \
    load/k6/slow-consumer.js > /dev/null 2>&1 & RECV_PID=$!
  sleep 2
  ROLE=feeders FEEDER_COUNT=${FEEDERS} FEED_COUNT=${FEED_COUNT} OBSERVE_MS=45000 \
    k6 run --quiet --summary-export "load/results/backpressure-feed-${COND}-${TAG}.json" \
    load/k6/slow-consumer.js > /dev/null 2>&1 & FEED_PID=$!
  sleep 3
fi

echo "== 피해자 쌍 ${VICTIM_PAIRS}: 각 50건을 300ms 간격(사람 속도)으로"
# k6 는 임계(유실 0) 위반이면 비0으로 끝난다. 그 유실이 바로 결과이므로 여기서
# 죽지 않고 요약을 끝까지 찍는다
ROLE=victims VICTIM_PAIRS=${VICTIM_PAIRS} PER_PERSON=50 VICTIM_INTERVAL_MS=300 OBSERVE_MS=40000 \
  k6 run --quiet --summary-export "load/results/backpressure-victim-${COND}-${TAG}.json" \
  load/k6/slow-consumer.js > /dev/null 2>&1 || true

[ -n "$FEED_PID" ] && wait "$FEED_PID" || true
[ -n "$RECV_PID" ] && wait "$RECV_PID" || true

REJ1=$(rejected); REJ1=${REJ1:-0}
SAVED1=$(psqlc -c "SELECT count(*) FROM chat_message WHERE chat_room_id BETWEEN 9421 AND 9450")

python3 - "load/results/backpressure-victim-${COND}-${TAG}.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
m = d['metrics']['message_round_trip' if 'message_round_trip' in d['metrics'] else 'victim_round_trip']
miss = d['metrics'].get('victim_missing', {}).get('count', 0)
rec = d['metrics'].get('victim_received', {}).get('count', 0)
print(f"   피해자 왕복: med {m['med']:.0f}ms · p95 {m['p(95)']:.0f}ms · 수신 {rec} · 유실 {miss}")
PY
if [ "$COND" = "flood" ]; then
  python3 - "load/results/backpressure-feed-${COND}-${TAG}.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(f"   먹이 시도: {d['metrics'].get('fed_messages', {}).get('count', 0)}건")
PY
fi
echo "   서버 거절: $((REJ1 - REJ0))건 · 먹이 방 저장 증가: $((SAVED1 - SAVED0))행"
echo "   끝 조건: $(uptime | sed 's/.*load/load/')"
