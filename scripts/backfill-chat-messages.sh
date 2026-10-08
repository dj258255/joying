#!/usr/bin/env bash
#
# 메시지 테이블을 옛 DB 에서 새 DB 로 커서 기반으로 옮긴다 (#105).
#
# 앱 밖에 둔 이유: 옮기는 속도는 라이브 전달과 자원을 다투므로 앱의 생명주기와
# 분리해 따로 조절해야 한다. 같은 이유로 속도 상한(ROWS_PER_SEC)이 첫 번째
# 매개변수다. 이 값과 전달 p95 의 충돌이 #107 이 재는 균형점이다.
#
# 동작: id 전순서 커서로 배치를 끊어 COPY 로 나르고, 새 DB 쪽에서는 스테이징
# 테이블을 거쳐 ON CONFLICT DO NOTHING 으로 넣는다. 이중 쓰기가 먼저 넣은 행과
# 겹쳐도 최종 상태가 같다(멱등). 커서를 파일로 남겨 중단한 자리에서 다시 시작한다.
#
# 쓰는 법:
#   scripts/backfill-chat-messages.sh <ROWS_PER_SEC> [BATCH] [CURSOR_FILE]
# 전제:
#   SRC_URI (기본 postgres://joying:joying@localhost:5432/project_db)
#   DST_URI (기본 postgres://joying:joying@localhost:15432/project_db)
#   새 DB 에 chat_message 스키마가 이미 있다 (scripts/init-chat-split-target.sh)
set -euo pipefail

RPS="${1:?초당 행 수 상한이 필요하다 (예: 5000)}"
BATCH="${2:-5000}"
CURSOR_FILE="${3:-/tmp/chat-backfill.cursor}"
SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"

CURSOR=$(cat "$CURSOR_FILE" 2>/dev/null || echo "")
TOTAL=0
STARTED=$(date +%s)

echo "백필 시작: rps=${RPS} batch=${BATCH} cursor='${CURSOR}'"

psql -q "$DST" -v ON_ERROR_STOP=1 -c \
  "CREATE UNLOGGED TABLE IF NOT EXISTS chat_message_stage
   (LIKE chat_message INCLUDING DEFAULTS);" > /dev/null

while true; do
  BATCH_START=$(python3 -c "import time; print(time.time())")

  psql -q "$SRC" -v ON_ERROR_STOP=1 -c \
    "COPY (SELECT * FROM chat_message WHERE id > '${CURSOR}' ORDER BY id LIMIT ${BATCH})
     TO STDOUT" \
    | psql -q "$DST" -v ON_ERROR_STOP=1 -c "COPY chat_message_stage FROM STDIN"

  ROWS=$(psql -q "$DST" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM chat_message_stage;")
  if [ "$ROWS" = "0" ]; then
    break
  fi
  LAST=$(psql -q "$DST" -At -v ON_ERROR_STOP=1 -c "SELECT max(id) FROM chat_message_stage;")
  psql -q "$DST" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO chat_message SELECT * FROM chat_message_stage
     ON CONFLICT (id) DO NOTHING;
     TRUNCATE chat_message_stage;" > /dev/null

  CURSOR="$LAST"
  echo "$CURSOR" > "$CURSOR_FILE"
  TOTAL=$((TOTAL + ROWS))

  # 스로틀: 배치가 이미 쓴 시간을 빼고 잔다. 상한보다 빠르게 가지 않는다
  python3 -c "
import time
elapsed = time.time() - ${BATCH_START}
budget = ${ROWS} / ${RPS}
if budget > elapsed:
    time.sleep(budget - elapsed)
"
done

ELAPSED=$(( $(date +%s) - STARTED ))
RATE=$([ "$ELAPSED" -gt 0 ] && echo $((TOTAL / ELAPSED)) || echo "$TOTAL")
echo "백필 끝: ${TOTAL}행, ${ELAPSED}초 (실효 ${RATE}행/초), 커서=${CURSOR}"
