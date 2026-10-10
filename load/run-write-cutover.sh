#!/usr/bin/env bash
#
# 정본 교대(#123)의 측정 러너.
#
# 서버는 이 스크립트가 띄우지 않는다(run-order-modes.sh 와 같은 이유). 두
# 프로세스(8080 · 8081)가 이중 쓰기 + 대상 DB 설정으로 떠 있고, 백필 · 검증이
# 끝난 상태를 전제한다. 송신자가 전부 한 회원(9001)이라 인바운드 레이트리밋은
# 꺼 둔다(joying.chat.inbound.rate-per-second=0). 재는 것은 교대지 백프레셔가
# 아니고, 전후를 같은 조건으로 두기 위해서다. 문서에 병기한다.
#
# 쓰는 법:
#   load/run-write-cutover.sh steady <라벨> <반복수>   # 지금 모드에서 전달을 잰다
#   load/run-write-cutover.sh switch <모드> <라벨>     # 송신 창 한가운데서 정본을 바꾼다
#   load/run-write-cutover.sh idem <라벨>              # 같은 식별자 재전송의 저장 증가를 센다
#
# 결과: load/results/write-cutover-<라벨>.csv 와 load/results/write-cutover-<라벨>.log
# 측정 규칙: 실행 전에 load 평균과 다른 측정 프로세스를 확인해 함께 기록한다.
set -euo pipefail

CMD="${1:?steady | switch | idem}"
NODES="${NODES:-http://localhost:8080 http://localhost:8081}"
SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15433/project_db}"
ROOM="${ROOM:-9001}"
SENDERS="${SENDERS:-8}"
PER_SENDER="${PER_SENDER:-150}"
SEND_INTERVAL_MS="${SEND_INTERVAL_MS:-200}"
OBSERVE_MS="${OBSERVE_MS:-50000}"

cd "$(dirname "$0")/.."
mkdir -p load/results

# 내부 손잡이(배리어 · 모드)용 토큰. k6 와 같은 로컬 비밀키로 만든다
mint_token() {
  python3 - << 'PY'
import base64, hashlib, hmac, json, time
SECRET = 'joying-local-secret-key-for-development-only'
def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
header = b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
now = int(time.time())
payload = b64url(json.dumps({'sub': '9001', 'iat': now, 'exp': now + 3600}).encode())
sig = b64url(hmac.new(SECRET.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
print(f'{header}.{payload}.{sig}')
PY
}

preflight() {
  for node in $NODES; do
    if ! curl -s -m 3 "${node}/actuator/health" | grep -q UP; then
      echo "노드(${node})가 떠 있지 않다. 서버를 먼저 띄운다" >&2
      exit 1
    fi
  done
  if [ "$(pgrep -fl 'k6 run' | grep -cv write-cutover || true)" != "0" ]; then
    echo "다른 k6 가 돌고 있다. p95 를 섞게 되므로 멈춘다" >&2
    exit 1
  fi
}

mode_of() {
  curl -s -H "Cookie: access_token=${TOKEN}" \
    "http://localhost:8080/internal/chat-migration" \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('mode','?'))"
}

summarize() {
  python3 - "$1" "$2" "$3" "$4" "$5" << 'PY'
import json, sys
s = json.load(open(sys.argv[1]))
m = s.get('metrics', {})
def c(name):
    return int(m.get(name, {}).get('count', 0))
def t(key):
    v = m.get('message_round_trip', {}).get(key)
    return '' if v is None else round(v, 1)
print(','.join(str(x) for x in [
    sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5],
    c('messages_received'), c('messages_missing'), c('order_inversions'),
    t('med'), t('p(95)')]))
PY
}

run_k6() {
  local summary=$1
  env ROOM="$ROOM" SENDERS="$SENDERS" PER_SENDER="$PER_SENDER" \
    SEND_INTERVAL_MS="$SEND_INTERVAL_MS" OBSERVE_MS="$OBSERVE_MS" \
    k6 run --quiet --summary-export "$summary" load/k6/two-node-delivery.js \
    > /dev/null 2>&1 || true   # 임계 위반의 비0 종료가 요약 전에 러너를 끊지 않게 한다
}

TOKEN=$(mint_token)
preflight

case "$CMD" in
  steady)
    LABEL="${2:?라벨}"; REPEATS="${3:?반복수}"
    OUT="load/results/write-cutover-${LABEL}.csv"
    echo "label,run,mode,load_before,received,missing,inversions,rt_med_ms,rt_p95_ms" > "$OUT"
    for i in $(seq 1 "$REPEATS"); do
      SUMMARY=$(mktemp)
      LOAD_NOW=$(uptime | awk '{print $(NF-2)}' | tr -d ',')
      run_k6 "$SUMMARY"
      summarize "$SUMMARY" "$LABEL" "$i" "$(mode_of)" "$LOAD_NOW" >> "$OUT"
      rm -f "$SUMMARY"
    done
    cat "$OUT"
    ;;

  switch)
    NEW_MODE="${2:?new-primary | dual-write}"; LABEL="${3:?라벨}"
    OUT="load/results/write-cutover-${LABEL}.csv"
    LOG="load/results/write-cutover-${LABEL}.log"
    echo "label,run,mode,load_before,received,missing,inversions,rt_med_ms,rt_p95_ms" > "$OUT"
    LOAD_NOW=$(uptime | awk '{print $(NF-2)}' | tr -d ',')
    SUMMARY=$(mktemp)
    run_k6 "$SUMMARY" &
    K6_PID=$!
    # 송신 창(PER_SENDER × 간격)의 한가운데서 바꾼다
    sleep $(( PER_SENDER * SEND_INTERVAL_MS / 1000 / 2 ))
    ACCESS_TOKEN="$TOKEN" NODES="$NODES" SRC_URI="$SRC" DST_URI="$DST" \
      SWITCH_MODE="$NEW_MODE" scripts/cutover-chat-split.sh | tee "$LOG"
    wait "$K6_PID"
    summarize "$SUMMARY" "$LABEL" 1 "$(mode_of)" "$LOAD_NOW" >> "$OUT"
    rm -f "$SUMMARY"
    cat "$OUT"
    ;;

  idem)
    LABEL="${2:?라벨}"
    IDS="${IDS:-10}"; RESENDS="${RESENDS:-3}"
    before_src=$(psql -At "$SRC" -c "SELECT count(*) FROM chat_message WHERE chat_room_id = ${ROOM};")
    before_dst=$(psql -At "$DST" -c "SELECT count(*) FROM chat_message WHERE chat_room_id = ${ROOM};")
    hits_before=$(curl -s http://localhost:8080/actuator/prometheus \
      | awk '$1 ~ /^chat_message_idempotent_hits_total/ {s+=$2} END {print s+0}')
    env ROOM="$ROOM" IDS="$IDS" RESENDS="$RESENDS" \
      k6 run --quiet load/k6/resend-idempotent.js > /dev/null 2>&1 || true
    sleep 3
    after_src=$(psql -At "$SRC" -c "SELECT count(*) FROM chat_message WHERE chat_room_id = ${ROOM};")
    after_dst=$(psql -At "$DST" -c "SELECT count(*) FROM chat_message WHERE chat_room_id = ${ROOM};")
    hits_after=$(curl -s http://localhost:8080/actuator/prometheus \
      | awk '$1 ~ /^chat_message_idempotent_hits_total/ {s+=$2} END {print s+0}')
    echo "label=${LABEL} mode=$(mode_of) 전송=$((IDS * RESENDS)) 식별자=${IDS}"
    echo "옛 DB 증가: $((after_src - before_src)) (기대 ${IDS})"
    echo "새 DB 증가: $((after_dst - before_dst)) (기대 ${IDS})"
    echo "멱등 히트 증가(8080): $((hits_after - hits_before)) (기대, 한 노드 기준 $((IDS * RESENDS - IDS)))"
    ;;

  *)
    echo "모르는 명령: $CMD" >&2
    exit 1
    ;;
esac
