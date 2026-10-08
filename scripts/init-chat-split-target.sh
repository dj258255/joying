#!/usr/bin/env bash
#
# 새 메시지 DB 에 chat_message 스키마를 그대로 만든다 (#105).
#
# 스키마를 손으로 다시 쓰지 않고 옛 DB 에서 덤프한다. 손으로 쓰면 열 하나가
# 어긋나도 COPY 가 깨질 때까지 모른다.
#
# 쓰는 법: scripts/init-chat-split-target.sh
#   SRC_URI, DST_URI 는 backfill 스크립트와 같은 기본값을 쓴다
set -euo pipefail

SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"

if psql -q "$DST" -At -c "SELECT to_regclass('chat_message');" | grep -q chat_message; then
  echo "새 DB 에 chat_message 가 이미 있다. 그대로 둔다"
  exit 0
fi

pg_dump --schema-only --no-owner --no-privileges -t chat_message "$SRC" | psql -q -v ON_ERROR_STOP=1 "$DST"
echo "스키마 복사 끝"
psql -q "$DST" -At -c "SELECT to_regclass('chat_message');"
