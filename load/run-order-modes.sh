#!/usr/bin/env bash
#
# 순서 복원 3파전(#91)의 본 측정 러너.
#
# 서버는 이 스크립트가 띄우지 않는다. 모드(node, arbiter)가 재기동을 요구해서
# 사람이 조건을 확인하고 띄우는 쪽이 사고가 적다. 두 프로세스(8080 · 8081)가
# 떠 있는지와 모드만 확인하고, k6 를 반복 실행해 실행별 요약을 CSV 로 모은다.
#
# 쓰는 법:
#   load/run-order-modes.sh <라벨> <반복수> [k6 환경변수...]
# 예:
#   load/run-order-modes.sh a-sticky    5 ASSIGN=concentrate
#   load/run-order-modes.sh b-arbiter   5 ASSIGN=cross
#   load/run-order-modes.sh c-holdback  5 ASSIGN=cross HOLD_MS=2000
#   load/run-order-modes.sh raw-cross   5 ASSIGN=cross            # 대조군(현상 재현)
#
# 결과: load/results/order-modes-<라벨>.csv (실행별 한 줄)
# 측정 규칙: 실행 전에 load 평균과 다른 측정 프로세스를 확인해 함께 기록한다.
# 다른 측정과 겹치면 돌리지 않는다 (p95 를 섞지 않는다).
set -euo pipefail

LABEL="${1:?라벨이 필요하다 (예: b-arbiter)}"
REPEATS="${2:?반복수가 필요하다}"
shift 2

cd "$(dirname "$0")/.."
mkdir -p load/results
OUT="load/results/order-modes-${LABEL}.csv"

# 측정 조건이 섰다는 증거를 먼저 남긴다. 0 과 "재지 않음" 을 구분하기 위해서다
for port in 8080 8081; do
  if ! curl -s -m 3 "http://localhost:${port}/actuator/health" | grep -q UP; then
    echo "노드(${port})가 떠 있지 않다. 서버를 먼저 띄운다" >&2
    exit 1
  fi
done
OTHER_LOAD=$(pgrep -fl "k6 run" | grep -cv "order-modes" || true)
if [ "${OTHER_LOAD}" != "0" ]; then
  echo "다른 k6 가 돌고 있다. 겹치면 p95 를 섞게 되므로 멈춘다" >&2
  exit 1
fi
LOADAVG=$(uptime | sed 's/.*load average[s]*: //')

echo "label,run,load_before,inversions_wire,inversions_release,gap_give_up,received,missing,rt_med_ms,rt_p95_ms,released_rt_med_ms,released_rt_p95_ms,buffer_wait_med_ms,buffer_wait_p95_ms" > "$OUT"

for i in $(seq 1 "$REPEATS"); do
  SUMMARY=$(mktemp)
  LOAD_NOW=$(uptime | sed 's/.*load average[s]*: //' | cut -d, -f1 | tr -d ' ')
  env "$@" k6 run --quiet --summary-export "$SUMMARY" load/k6/order-modes.js >/dev/null
  python3 - "$SUMMARY" "$LABEL" "$i" "$LOAD_NOW" >> "$OUT" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
m = s.get('metrics', {})
def c(name):
    return int(m.get(name, {}).get('count', 0))
def t(name, key):
    v = m.get(name, {}).get(key)
    return '' if v is None else round(v, 1)
print(','.join(str(x) for x in [
    sys.argv[2], sys.argv[3], sys.argv[4],
    c('order_inversions'), c('release_inversions'), c('gap_give_up'),
    c('messages_received'), c('messages_missing'),
    t('message_round_trip', 'med'), t('message_round_trip', 'p(95)'),
    t('released_round_trip', 'med'), t('released_round_trip', 'p(95)'),
    t('buffer_wait', 'med'), t('buffer_wait', 'p(95)'),
]))
PY
  rm -f "$SUMMARY"
  echo "  ${LABEL} ${i}/${REPEATS} 끝 (load ${LOAD_NOW})"
  sleep 3
done

echo "결과: $OUT (시작 시 load: ${LOADAVG})"
