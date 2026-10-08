#!/usr/bin/env bash
#
# 안읽음을 세는 두 방법의 값을 따로 잰다 (#96).
#
# 이 서비스는 카운터(Redis unread:{방}:{사람}, TTL 7일)를 캐시로, 커서(lastReadSequence
# 초과 집계)를 정본으로 함께 쓴다. 어느 쪽이 비용을 내는지 숫자로 적은 적이 없다.
#
# 재는 것 둘:
#   1) 쓰기 증폭  메시지가 올 때 Redis 쓰기가 몇 번 느는지. MONITOR 를 잠깐 켜 두고
#                 그 사이 메시지를 보낸 뒤 INCR 를 키 접두사별로 센다
#   2) 조회 지연  방 목록(GET /api/v1/chat-rooms)의 시간. 캐시 히트 그대로 N회,
#                 캐시 미스는 반복마다 unread 키를 지워 warmup(DB 집계)을 태운다
#
# 전제: 서버 1대(8080)와 joying-redis, joying-postgres 가 떠 있다.
#       바쁜 방 조건은 메시지를 많이 가진 방이다. ROWS 로 시드한다.
#
# 실행: load/run-unread-two-ways.sh [조회반복수] [시드행수]
set -euo pipefail

REPEATS="${1:-30}"
ROWS="${2:-50000}"
ROOM=9501
READER=9002   # 안읽음을 보는 사람 (방 목록을 조회)
SENDER=9001   # 쌓는 사람
API="${API1:-http://localhost:8080}"
SECRET="${JWT_SECRET:-joying-local-secret-key-for-development-only}"
PG="${PG_CONTAINER:-joying-postgres}"
REDIS="${REDIS_CONTAINER:-joying-redis}"
REDIS_PASS="${REDIS_PASSWORD:-joying_redis_password}"

cd "$(dirname "$0")/.."
mkdir -p load/results

rcli() { docker exec "$REDIS" redis-cli -a "$REDIS_PASS" --no-auth-warning "$@"; }
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

echo "== 시드: 방 ${ROOM} 에 메시지 ${ROWS}건 (sender=${SENDER}, reader=${READER})"
psqlc <<SQL
INSERT INTO member (member_id, nickname, email, rating, rating_count, created_at, updated_at)
VALUES (${SENDER}, '재는사람1', 'load-a@joying.test', 0, 0, NOW(), NOW()),
       (${READER}, '재는사람2', 'load-b@joying.test', 0, 0, NOW(), NOW())
ON CONFLICT (member_id) DO NOTHING;
INSERT INTO chat_room (chat_room_id, buyer_id, seller_id, status, created_at, updated_at)
VALUES (${ROOM}, ${SENDER}, ${READER}, 'ACTIVE', NOW(), NOW())
ON CONFLICT (chat_room_id) DO NOTHING;
INSERT INTO chat_room_member (chat_room_id, member_id, is_pinned, is_muted, is_left, created_at, updated_at)
VALUES (${ROOM}, ${SENDER}, false, false, false, NOW(), NOW()),
       (${ROOM}, ${READER}, false, false, false, NOW(), NOW())
ON CONFLICT DO NOTHING;
DELETE FROM chat_message WHERE chat_room_id = ${ROOM};
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          is_deleted, is_edited, is_read, created_at)
SELECT '${ROOM}-' || i, ${ROOM}, i, ${SENDER}, 'TEXT', '메시지 ' || i, false, false, false,
       NOW() - (${ROWS} - i) * INTERVAL '1 second'
FROM generate_series(1, ${ROWS}) AS i;
-- 읽은 지점을 낮게 둬 집계가 넓은 범위를 세게 한다 (한 번도 안 읽은 것에 가깝게)
UPDATE chat_room_member SET last_read_sequence = 10
WHERE chat_room_id = ${ROOM} AND member_id = ${READER};
SQL

TOKEN=$(token ${READER})
OUT="load/results/unread-two-ways.csv"
echo "mode,run,http_ms" > "$OUT"

echo "== 1) 쓰기 증폭: MONITOR 를 켠 동안 실제 경로(STOMP)로 메시지 40건을 보낸다"
MON=$(mktemp)
(rcli MONITOR > "$MON" 2>/dev/null) & MONPID=$!
sleep 1
# 쌍 1 모드는 회원 9001 · 9002 를 쓰므로 방 ${ROOM} 의 시드와 맞는다
ROOM=${ROOM} PER_PERSON=20 OBSERVE_MS=15000 HOLD_MS=0 ASSIGN=concentrate \
  k6 run --quiet load/k6/order-modes.js > /dev/null || true
sleep 1
kill $MONPID 2>/dev/null || true
SEQ_INCR=$(grep -c '"INCR" "chat:sequence:' "$MON" || true)
UNREAD_INCR=$(grep -c '"INCR" "unread:' "$MON" || true)
TOTAL_CMDS=$(wc -l < "$MON")
echo "   MONITOR ${TOTAL_CMDS}줄: 번호 INCR ${SEQ_INCR}건, 안읽음 INCR ${UNREAD_INCR}건 (메시지 40건 기준)"
echo "   원자료: $MON (지우지 않음)"

echo "== 2) 조회 지연: 히트 ${REPEATS}회"
for i in $(seq 1 "$REPEATS"); do
  ms=$(curl -s -o /dev/null -w '%{time_total}' -H "Cookie: access_token=${TOKEN}" \
    "$API/api/v1/chat-rooms" | awk '{printf "%.1f", $1 * 1000}')
  echo "hit,$i,$ms" >> "$OUT"
done

echo "== 3) 조회 지연: 미스 ${REPEATS}회 (반복마다 unread 키를 지워 DB 집계를 태운다)"
for i in $(seq 1 "$REPEATS"); do
  rcli DEL "unread:${ROOM}:${READER}" > /dev/null
  ms=$(curl -s -o /dev/null -w '%{time_total}' -H "Cookie: access_token=${TOKEN}" \
    "$API/api/v1/chat-rooms" | awk '{printf "%.1f", $1 * 1000}')
  echo "miss,$i,$ms" >> "$OUT"
done

python3 - "$OUT" <<'PY'
import csv, statistics, sys
rows = list(csv.DictReader(open(sys.argv[1])))
for mode in ('hit', 'miss'):
    vals = sorted(float(r['http_ms']) for r in rows if r['mode'] == mode)
    if vals:
        p95 = vals[min(len(vals) - 1, int(len(vals) * 0.95))]
        print(f"   {mode}: 중앙값 {statistics.median(vals):.1f}ms · p95 {p95:.1f}ms · n={len(vals)}")
PY
echo "결과: $OUT"
