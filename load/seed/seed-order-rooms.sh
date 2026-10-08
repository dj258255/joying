#!/usr/bin/env bash
#
# 순서 복원 실험(#91)에서 집중 대 분산을 재는 데 쓸 쌍 여러 개를 만든다.
#
# 스티키는 한 방의 트래픽을 한 노드에 모은다. 그 집중이 얼마짜리인지 보려면
# 방 하나로는 안 되고, 같은 총 송신률을 한 노드에 모은 경우와 두 노드에 가른
# 경우로 나눠 재야 한다. 그래서 쌍(방 하나, 사람 둘)을 여러 개 만든다.
#
#   방    9401 .. 9400+N
#   회원  9301 .. 9300+2N  (방 i 의 구매자는 9300+2i-1, 판매자는 9300+2i)
#
# 실행: load/seed/seed-order-rooms.sh [쌍수] [컨테이너이름]
#
# 만든 뒤 재는 것:
#   PAIRS=N ASSIGN=concentrate k6 run load/k6/order-modes.js
#   PAIRS=N ASSIGN=cross       k6 run load/k6/order-modes.js
#
# 메시지는 미리 넣지 않는다. 실험이 보내는 것이 전부다. 다시 돌릴 때 이전 실행의
# 메시지가 쌓여 있어도 번호는 Redis 가 이어 가므로 순서 판정에는 영향이 없다.
set -euo pipefail

PAIRS="${1:-10}"
PG="${2:-joying-postgres}"
DB="${POSTGRES_DATABASE:-project_db}"
USER="${POSTGRES_USERNAME:-joying}"

psql() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" -q "$@"; }

echo "쌍 ${PAIRS}개(방 9401..$((9400 + PAIRS)))를 만든다 (컨테이너: $PG)"

psql <<SQL
-- 사람 2N 명. 이미 있으면 그대로 둔다
INSERT INTO member (member_id, nickname, email, rating, rating_count, created_at, updated_at)
SELECT 9300 + i, '재는사람' || (9300 + i), 'load-' || (9300 + i) || '@joying.test',
       0, 0, NOW(), NOW()
FROM generate_series(1, ${PAIRS} * 2) AS i
ON CONFLICT (member_id) DO NOTHING;

-- 방 N 개. 방 i 의 구매자는 9300+2i-1, 판매자는 9300+2i
INSERT INTO chat_room (chat_room_id, buyer_id, seller_id, status, created_at, updated_at)
SELECT 9400 + i, 9300 + 2 * i - 1, 9300 + 2 * i, 'ACTIVE', NOW(), NOW()
FROM generate_series(1, ${PAIRS}) AS i
ON CONFLICT (chat_room_id) DO NOTHING;

INSERT INTO chat_room_member (chat_room_id, member_id, is_pinned, is_muted, is_left,
                              created_at, updated_at)
SELECT 9400 + i, 9300 + 2 * i - 1 + side, false, false, false, NOW(), NOW()
FROM generate_series(1, ${PAIRS}) AS i, (VALUES (0), (1)) AS sides(side)
ON CONFLICT DO NOTHING;
SQL

echo "끝. PAIRS=${PAIRS} 로 order-modes.js 를 돌릴 수 있다"
