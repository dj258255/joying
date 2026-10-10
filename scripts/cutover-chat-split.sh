#!/usr/bin/env bash
#
# 분리 이관의 컷오버 (#105 판정 기준 4) + 정본 교대 (#123).
#
# 순서: 모든 노드에 쓰기 배리어를 세우고 → 꼬리 백필(커서 이후의 마지막 몇 행)을
# 긁고 → 양쪽 끝(max id)이 같은지 보고 → (SWITCH_MODE 가 있으면 모든 노드의
# 정본을 그 모드로 바꾸고) → 배리어를 내린다. 배리어 동안 새 저장이 없으므로
# 이 사이에 꼬리와 전환을 다 끝내면 잔여 불일치가 0이고, 두 노드가 다른 정본으로
# 사는 창에도 저장이 없다.
#
# 배리어 안에서는 ms 단위로 끝나는 확인(max id)만 한다. 전체 행 수와 체크섬
# 검증(verify-chat-split.sh)은 무겁고, 이중 쓰기가 계속 도는 한 배리어 밖에서
# 해도 결과가 같다.
#
# 배리어는 노드마다 따로 선다(메모리 상태). NODES 의 모든 노드에 올리고 내린다.
# 끝 비교가 어긋나면 전환 없이 배리어만 내리고 실패로 끝난다.
#
# 쓰는 법: ACCESS_TOKEN=<jwt> scripts/cutover-chat-split.sh [커서파일]
#   NODES (기본 "http://localhost:8080 http://localhost:8081")
#   SWITCH_MODE (비우면 종전처럼 배리어 리허설만, new-primary 면 정본 교대,
#                dual-write 면 되돌림)
set -euo pipefail

CURSOR_FILE="${1:-/tmp/chat-backfill.cursor}"
NODES="${NODES:-http://localhost:8080 http://localhost:8081}"
TOKEN="${ACCESS_TOKEN:?배리어 손잡이는 인증이 필요하다. ACCESS_TOKEN 을 준다}"
SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"
SWITCH_MODE="${SWITCH_MODE:-}"

barrier() {
  local onoff=$1
  for node in $NODES; do
    curl -s -X POST -H "Cookie: access_token=${TOKEN}" \
      "${node}/internal/chat-migration/barrier/${onoff}" > /dev/null
  done
}

switch_mode() {
  local value=$1
  for node in $NODES; do
    # 전환 실패(배리어 없음 등)는 본문으로 드러난다. 노드별 결과를 그대로 남긴다
    echo "모드 전환 ${node}: $(curl -s -X POST -H "Cookie: access_token=${TOKEN}" \
      "${node}/internal/chat-migration/mode/${value}")"
  done
}

echo "컷오버 시작 $(date '+%T.%3N')"
T0=$(python3 -c "import time; print(int(time.time()*1000))")

barrier on

# 꼬리 백필: 배리어 뒤에는 새 행이 없으므로 0행이 나올 때까지 긁으면 끝이다
scripts/backfill-chat-messages.sh 1000000 5000 "$CURSOR_FILE" | tail -1

SRC_MAX=$(psql -At "$SRC" -c "SELECT max(id) FROM chat_message;")
DST_MAX=$(psql -At "$DST" -c "SELECT max(id) FROM chat_message;")

if [ "$SRC_MAX" != "$DST_MAX" ]; then
  barrier off
  echo "끝 비교: 옛 '${SRC_MAX}' · 새 '${DST_MAX}'"
  echo "판정: 끝이 다르다. 전환 없이 배리어를 내렸다. 컷오버 실패"
  exit 1
fi

if [ -n "$SWITCH_MODE" ]; then
  switch_mode "$SWITCH_MODE"
fi

barrier off
T1=$(python3 -c "import time; print(int(time.time()*1000))")

echo "배리어 시간: $((T1 - T0))ms"
echo "끝 비교: 옛 '${SRC_MAX}' · 새 '${DST_MAX}' (일치)"
if [ -n "$SWITCH_MODE" ]; then
  echo "판정: 정본이 ${SWITCH_MODE} 다. 전체 검증은 verify-chat-split.sh 로 잇는다"
else
  echo "판정: 끝 일치. 전체 검증은 verify-chat-split.sh 로 잇는다"
fi
