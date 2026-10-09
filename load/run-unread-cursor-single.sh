#!/usr/bin/env bash
#
# 안읽음 커서 단일화의 비용을 방이 많은 목록으로 잰다 (#116).
#
# unread-two-ways(#96)가 방 1개 기준으로 "캐시의 값이 작다"고 판정했다. 남은 것은
# 방이 많은 사용자다. 커서 단일(cursor 모드)은 방 목록 한 번에 방 수만큼 집계가
# 돌므로, 30방(바쁜 방 1개 5만 건 + 보통 방 29개)에서 p95 를 잰다.
#
# 서버의 모드는 이 스크립트가 바꾸지 않는다. JOYING_CHAT_UNREAD_MODE 로 띄운
# 서버에 대고 그 모드 이름을 첫 인자로 넘겨 기록만 맞춘다.
#
#   JOYING_CHAT_UNREAD_MODE=counter 로 서버 기동 → load/run-unread-cursor-single.sh counter
#   JOYING_CHAT_UNREAD_MODE=cursor  로 서버 기동 → load/run-unread-cursor-single.sh cursor
#
# counter 모드는 히트(그대로)와 미스(반복마다 unread 키 전부 삭제) 둘을,
# cursor 모드는 한 series 만 잰다(캐시가 없어 히트 · 미스 구분이 없다).
#
# 쓰기 증폭은 키 값의 전후 차이로 센다. MONITOR 는 비TTY 에서 유실된 적이 있다.
set -euo pipefail

MODE="${1:?counter 또는 cursor}"
REPEATS="${2:-30}"
ROOMS="${3:-30}"
BUSY_ROWS="${4:-50000}"
NORMAL_ROWS=200
BASE_ROOM=9500
READER=9002
SENDER=9001
API="${API1:-http://localhost:8080}"
SECRET="${JWT_SECRET:-joying-local-secret-key-for-development-only}"
PG="${PG_CONTAINER:-joying-postgres}"
# 서버가 쓰는 Redis 는 호스트 네이티브(6379, 무인증)다. 컨테이너 쪽을 지우면
# 아무도 안 쓰는 캐시를 지운 꼴이 된다 (unread-two-ways 의 사고)
RCLI=(redis-cli -h 127.0.0.1 -p "${REDIS_PORT:-6379}")

cd "$(dirname "$0")/.."
mkdir -p load/results

psqlc() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U joying -d project_db -q "$@"; }

token() {
  python3 - "$1" "$SECRET" <<'PY'
import sys, hmac, hashlib, base64, json, time
def b64(d): return base64.urlsafe_b64encode(d).rstrip(b'=').decode()
member, secret = sys.argv[1], sys.argv[2]
h = b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
p = b64(json.dumps({"sub":member,"iat":int(time.time()),"exp":int(time.time())+3600}).encode())
sig = b64(hmac.new(secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())
print(f"{h}.{p}.{sig}")
PY
}

echo "== 시작 조건: $(uptime | sed 's/.*load/load/'), k6=$(pgrep -c k6 || true)"

echo "== 시드: 방 ${ROOMS}개 (바쁜 방 $((BASE_ROOM+1)) 에 ${BUSY_ROWS}건, 나머지 ${NORMAL_ROWS}건씩)"
psqlc <<SQL
INSERT INTO member (member_id, nickname, email, rating, rating_count, created_at, updated_at)
VALUES (${SENDER}, '재는사람1', 'load-a@joying.test', 0, 0, NOW(), NOW()),
       (${READER}, '재는사람2', 'load-b@joying.test', 0, 0, NOW(), NOW())
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO chat_room (chat_room_id, buyer_id, seller_id, status, created_at, updated_at)
SELECT ${BASE_ROOM} + i, ${SENDER}, ${READER}, 'ACTIVE', NOW(), NOW()
FROM generate_series(1, ${ROOMS}) AS i
ON CONFLICT (chat_room_id) DO NOTHING;

INSERT INTO chat_room_member (chat_room_id, member_id, is_pinned, is_muted, is_left, created_at, updated_at)
SELECT ${BASE_ROOM} + i, m, false, false, false, NOW(), NOW()
FROM generate_series(1, ${ROOMS}) AS i, unnest(ARRAY[${SENDER}, ${READER}]) AS m
ON CONFLICT DO NOTHING;

DELETE FROM chat_message
WHERE chat_room_id BETWEEN ${BASE_ROOM} + 1 AND ${BASE_ROOM} + ${ROOMS};

-- 바쁜 방
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          is_deleted, is_edited, is_read, created_at)
SELECT '$((BASE_ROOM+1))-' || i, $((BASE_ROOM+1)), i, ${SENDER}, 'TEXT', '메시지 ' || i,
       false, false, false, NOW() - (${BUSY_ROWS} - i) * INTERVAL '1 second'
FROM generate_series(1, ${BUSY_ROWS}) AS i;

-- 보통 방
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          is_deleted, is_edited, is_read, created_at)
SELECT (${BASE_ROOM} + r) || '-' || i, ${BASE_ROOM} + r, i, ${SENDER}, 'TEXT', '메시지 ' || i,
       false, false, false, NOW() - (${NORMAL_ROWS} - i) * INTERVAL '1 second'
FROM generate_series(2, ${ROOMS}) AS r, generate_series(1, ${NORMAL_ROWS}) AS i;

-- 읽은 지점을 낮게 둬 집계가 넓은 범위를 세게 한다
UPDATE chat_room_member SET last_read_sequence = 10
WHERE chat_room_id BETWEEN ${BASE_ROOM} + 1 AND ${BASE_ROOM} + ${ROOMS}
  AND member_id = ${READER};
SQL

# 번호표(Redis)를 시드의 최대 번호에 맞춘다. 맞추지 않으면 다음 실제 송신이
# 시드와 같은 번호를 받는다. #100 이 예측한 번호 중복을 이 시드가 직접 만들었고,
# 섀도 리드 비교(#120)가 정렬 동률 비결정으로 그것을 잡았다
for r in $(seq 1 "$ROOMS"); do
  room=$((BASE_ROOM + r))
  top=$([ "$r" -eq 1 ] && echo "$BUSY_ROWS" || echo "$NORMAL_ROWS")
  cur=$("${RCLI[@]}" GET "chat:sequence:${room}"); cur=${cur:-0}
  if [ "$cur" -lt "$top" ]; then
    "${RCLI[@]}" SET "chat:sequence:${room}" "$top" > /dev/null
  fi
done

TOKEN=$(token ${READER})
OUT="load/results/unread-cursor-single-${MODE}.csv"
echo "series,run,http_ms" > "$OUT"

list_ms() {
  curl -s -o /dev/null -w '%{time_total}' -H "Cookie: access_token=${TOKEN}" \
    "$API/api/v1/chat-rooms" | awk '{printf "%.1f", $1 * 1000}'
}

flush_unread_keys() {
  "${RCLI[@]}" --scan --pattern "unread:95*:${READER}" | while read -r k; do
    "${RCLI[@]}" DEL "$k" > /dev/null
  done
}

# 첫 호출은 워밍(JIT · 커넥션 풀)으로 버린다
list_ms > /dev/null

if [ "$MODE" = "counter" ]; then
  echo "== 조회: 히트 ${REPEATS}회"
  for i in $(seq 1 "$REPEATS"); do
    echo "hit,$i,$(list_ms)" >> "$OUT"
  done
  echo "== 조회: 미스 ${REPEATS}회 (반복마다 unread 키 전부 삭제)"
  for i in $(seq 1 "$REPEATS"); do
    flush_unread_keys
    echo "miss,$i,$(list_ms)" >> "$OUT"
  done
else
  echo "== 조회: cursor ${REPEATS}회"
  for i in $(seq 1 "$REPEATS"); do
    echo "cursor,$i,$(list_ms)" >> "$OUT"
  done
fi

echo "== 쓰기 증폭: 실제 경로(STOMP)로 40건 보내고 키 값의 전후 차이를 센다"
BUSY=$((BASE_ROOM+1))
rget() { local v; v=$("${RCLI[@]}" GET "$1"); echo "${v:-0}"; }
SEQ_BEFORE=$(rget "chat:sequence:${BUSY}")
# 양방향으로 보내므로 안읽음은 두 사람 키에 20건씩 나뉜다. 둘 다 센다
UNREAD_BEFORE=$(( $(rget "unread:${BUSY}:${READER}") + $(rget "unread:${BUSY}:${SENDER}") ))
ROOM=${BUSY} PER_PERSON=20 OBSERVE_MS=15000 HOLD_MS=0 ASSIGN=concentrate \
  k6 run --quiet load/k6/order-modes.js > /dev/null || true
SEQ_AFTER=$(rget "chat:sequence:${BUSY}")
UNREAD_AFTER=$(( $(rget "unread:${BUSY}:${READER}") + $(rget "unread:${BUSY}:${SENDER}") ))
echo "   번호 키 증가 $((SEQ_AFTER - SEQ_BEFORE)) · 안읽음 키 증가 $((UNREAD_AFTER - UNREAD_BEFORE)) (메시지 40건 기준, 모드 ${MODE})"
echo "writes,seq_delta,$((SEQ_AFTER - SEQ_BEFORE))" >> "$OUT"
echo "writes,unread_delta,$((UNREAD_AFTER - UNREAD_BEFORE))" >> "$OUT"

python3 - "$OUT" <<'PY'
import csv, statistics, sys
rows = list(csv.DictReader(open(sys.argv[1])))
for series in ('hit', 'miss', 'cursor'):
    vals = sorted(float(r['http_ms']) for r in rows if r['series'] == series)
    if vals:
        p95 = vals[min(len(vals) - 1, int(len(vals) * 0.95))]
        print(f"   {series}: 중앙값 {statistics.median(vals):.1f}ms · p95 {p95:.1f}ms · n={len(vals)}")
PY
echo "결과: $OUT"
