#!/usr/bin/env bash
#
# 가변 열을 옛 DB 기준으로 새 DB 에 다시 맞춘다 (#120).
#
# 이중 쓰기(#105)는 삽입만 비춘다. 읽음(is_read) · 수정(content, is_edited,
# original_content, updated_at) · 삭제(is_deleted)는 옛 DB 에만 반영되므로,
# 읽기 전환 전에 이 열들을 한 번 맞추고 섀도 리드가 0 을 말하는지 본다.
#
# 방식: 옛 DB 의 (id, 가변 열)을 COPY 로 뽑아 새 DB 의 스테이지 테이블에 붓고,
# 값이 다른 행만 UPDATE 한다. IS DISTINCT FROM 이라 NULL 차이도 잡는다.
#
# 쓰는 법: scripts/resync-chat-split-mutable.sh
#   SRC_URI, DST_URI 는 backfill 스크립트와 같은 기본값
set -euo pipefail

SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"

MUTABLE="id, content, is_edited, original_content, is_deleted, is_read, updated_at"

psql -q -v ON_ERROR_STOP=1 "$DST" <<'SQL'
DROP TABLE IF EXISTS chat_message_resync_stage;
CREATE UNLOGGED TABLE chat_message_resync_stage (
  id varchar(36) PRIMARY KEY,
  content varchar(2000),
  is_edited boolean,
  original_content varchar(2000),
  is_deleted boolean,
  is_read boolean,
  updated_at timestamptz
);
SQL

echo "== 옛 DB 가변 열을 스테이지로 복사"
psql -q -v ON_ERROR_STOP=1 "$SRC" \
  -c "\\copy (SELECT ${MUTABLE} FROM chat_message) TO STDOUT" \
  | psql -q -v ON_ERROR_STOP=1 "$DST" -c "\\copy chat_message_resync_stage FROM STDIN"

echo "== 다른 행만 갱신"
psql -v ON_ERROR_STOP=1 "$DST" <<'SQL'
WITH changed AS (
  UPDATE chat_message m
  SET content = s.content,
      is_edited = s.is_edited,
      original_content = s.original_content,
      is_deleted = s.is_deleted,
      is_read = s.is_read,
      updated_at = s.updated_at
  FROM chat_message_resync_stage s
  WHERE m.id = s.id
    AND (m.content IS DISTINCT FROM s.content
      OR m.is_edited IS DISTINCT FROM s.is_edited
      OR m.original_content IS DISTINCT FROM s.original_content
      OR m.is_deleted IS DISTINCT FROM s.is_deleted
      OR m.is_read IS DISTINCT FROM s.is_read
      OR m.updated_at IS DISTINCT FROM s.updated_at)
  RETURNING m.id
)
SELECT count(*) AS resynced_rows FROM changed;
DROP TABLE chat_message_resync_stage;
SQL

echo "== 끝. 이 수가 0이 될 때까지(이중 쓰기 중이면 방금 쓴 행만큼은 남는다) 반복할 수 있다"
