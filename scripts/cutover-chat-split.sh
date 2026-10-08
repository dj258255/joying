#!/usr/bin/env bash
#
# 분리 이관의 컷오버 (#105 판정 기준 4).
#
# 순서: 모든 노드에 쓰기 배리어를 세우고 → 꼬리 백필(커서 이후의 마지막 몇 행)을
# 긁고 → 양쪽 끝(max id)이 같은지 보고 → 배리어를 내린다. 배리어 동안 새 저장이
# 없으므로 이 사이에 꼬리를 다 옮기면 잔여 불일치가 0이 된다.
#
# 배리어 안에서는 ms 단위로 끝나는 확인(max id)만 한다. 전체 행 수와 체크섬
# 검증(verify-chat-split.sh)은 무겁고, 이중 쓰기가 계속 도는 한 배리어 밖에서
# 해도 결과가 같다.
#
# 배리어는 노드마다 따로 선다(메모리 상태). NODES 의 모든 노드에 올리고 내린다.
#
# 쓰는 법: ACCESS_TOKEN=<jwt> scripts/cutover-chat-split.sh [커서파일]
#   NODES (기본 "http://localhost:8080 http://localhost:8081")
set -euo pipefail

CURSOR_FILE="${1:-/tmp/chat-backfill.cursor}"
NODES="${NODES:-http://localhost:8080 http://localhost:8081}"
TOKEN="${ACCESS_TOKEN:?배리어 손잡이는 인증이 필요하다. ACCESS_TOKEN 을 준다}"
SRC="${SRC_URI:-postgres://joying:joying@localhost:5432/project_db}"
DST="${DST_URI:-postgres://joying:joying@localhost:15432/project_db}"

barrier() {
  local onoff=$1
  for node in $NODES; do
    curl -s -X POST -H "Cookie: access_token=${TOKEN}" \
      "${node}/internal/chat-migration/barrier/${onoff}" > /dev/null
  done
}

echo "컷오버 시작 $(date '+%T.%3N')"
T0=$(python3 -c "import time; print(int(time.time()*1000))")

barrier on

# 꼬리 백필: 배리어 뒤에는 새 행이 없으므로 0행이 나올 때까지 긁으면 끝이다
scripts/backfill-chat-messages.sh 1000000 5000 "$CURSOR_FILE" | tail -1

SRC_MAX=$(psql -At "$SRC" -c "SELECT max(id) FROM chat_message;")
DST_MAX=$(psql -At "$DST" -c "SELECT max(id) FROM chat_message;")

barrier off
T1=$(python3 -c "import time; print(int(time.time()*1000))")

echo "배리어 시간: $((T1 - T0))ms"
echo "끝 비교: 옛 '${SRC_MAX}' · 새 '${DST_MAX}'"
if [ "$SRC_MAX" != "$DST_MAX" ]; then
  echo "판정: 끝이 다르다. 컷오버 실패"
  exit 1
fi
echo "판정: 끝 일치. 전체 검증은 verify-chat-split.sh 로 잇는다"
