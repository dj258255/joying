#!/usr/bin/env bash
#
# 두 DB 의 chat_message 가 같은지 확인한다 (#105 판정 기준 1).
#
# 세 겹으로 본다.
#   1) 행 수
#   2) 끝쪽 1,000행의 체크섬 (id 전순서의 꼬리. 이중 쓰기와 꼬리 백필이 만나는 자리)
#   3) 결정적 표본 1,000행 안팎의 체크섬
#      (md5(id) 접두사로 뽑는다. 무작위 표본은 양쪽이 다른 행을 뽑으므로 비교가
#       안 되고, 해시 표본은 양쪽에서 같은 행이 뽑히면서 전 구간에 고르게 퍼진다)
#
# 체크섬 열은 저장 시점에 정해지는 불변 열만 쓴다. is_read 처럼 나중에 바뀌는
# 열은 이중 쓰기 범위 밖이라(한계로 문서화) 비교에서 뺀다.
set -euo pipefail

SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"

IMMUTABLE="concat_ws('|', id, chat_room_id, sequence, sender_id, type, content, client_message_id, created_at)"

q() { psql -q -At -v ON_ERROR_STOP=1 "$1" -c "$2"; }

SRC_COUNT=$(q "$SRC" "SELECT count(*) FROM chat_message;")
DST_COUNT=$(q "$DST" "SELECT count(*) FROM chat_message;")

TAIL_SQL="SELECT md5(string_agg(h, '' ORDER BY id)) FROM (
  SELECT id, md5(${IMMUTABLE}) h FROM chat_message ORDER BY id DESC LIMIT 1000) t;"
SRC_TAIL=$(q "$SRC" "$TAIL_SQL")
DST_TAIL=$(q "$DST" "$TAIL_SQL")

SAMPLE_SQL="SELECT md5(string_agg(md5(${IMMUTABLE}), '' ORDER BY id)), count(*)
  FROM chat_message WHERE md5(id) LIKE '00%';"
SRC_SAMPLE=$(q "$SRC" "$SAMPLE_SQL")
DST_SAMPLE=$(q "$DST" "$SAMPLE_SQL")

echo "행 수:        옛 ${SRC_COUNT} · 새 ${DST_COUNT}"
echo "꼬리 1000:    옛 ${SRC_TAIL} · 새 ${DST_TAIL}"
echo "해시 표본:    옛 ${SRC_SAMPLE} · 새 ${DST_SAMPLE}"

if [ "$SRC_COUNT" = "$DST_COUNT" ] && [ "$SRC_TAIL" = "$DST_TAIL" ] && [ "$SRC_SAMPLE" = "$DST_SAMPLE" ]; then
  echo "판정: 일치"
else
  echo "판정: 불일치"
  exit 1
fi
