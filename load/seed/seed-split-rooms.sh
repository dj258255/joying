#!/usr/bin/env bash
#
# 저장소 분리 이관 실험(#105)의 백필 대상을 만든다.
#
# 백필 부하가 측정 창(수십 초) 내내 지속되려면 행이 충분해야 한다. 방 10개에
# 합쳐 ROWS 행(기본 300만)을 넣는다. 재실행하면 지우고 다시 넣는다.
#
# 실행: load/seed/seed-split-rooms.sh [총행수] [컨테이너이름]
set -euo pipefail

ROWS="${1:-3000000}"
PG="${2:-joying-postgres}"
DB="${POSTGRES_DATABASE:-project_db}"
USER="${POSTGRES_USERNAME:-joying}"
PER_ROOM=$((ROWS / 10))

psql() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" -q "$@"; }

echo "방 9601..9610 에 합계 ${ROWS}행을 만든다 (방당 ${PER_ROOM})"

psql <<SQL
INSERT INTO member (member_id, nickname, email, rating, rating_count, created_at, updated_at)
SELECT 9600 + i, '재는사람' || (9600 + i), 'load-' || (9600 + i) || '@joying.test',
       0, 0, NOW(), NOW()
FROM generate_series(1, 20) AS i
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO chat_room (chat_room_id, buyer_id, seller_id, status, created_at, updated_at)
SELECT 9600 + i, 9600 + 2 * i - 1, 9600 + 2 * i, 'ACTIVE', NOW(), NOW()
FROM generate_series(1, 10) AS i
ON CONFLICT (chat_room_id) DO NOTHING;

INSERT INTO chat_room_member (chat_room_id, member_id, is_pinned, is_muted, is_left,
                              created_at, updated_at)
SELECT 9600 + i, 9600 + 2 * i - 1 + side, false, false, false, NOW(), NOW()
FROM generate_series(1, 10) AS i, (VALUES (0), (1)) AS sides(side)
ON CONFLICT DO NOTHING;

DELETE FROM chat_message WHERE chat_room_id BETWEEN 9601 AND 9610;

INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          is_deleted, is_edited, is_read, created_at)
SELECT 'split-' || r || '-' || i, 9600 + r, i, 9600 + 2 * r - 1, 'TEXT',
       '이관 대상 ' || i, false, false, false,
       NOW() - (${PER_ROOM} - i) * INTERVAL '1 millisecond'
FROM generate_series(1, 10) AS r, generate_series(1, ${PER_ROOM}) AS i;
SQL

echo "끝. 행 수:"
psql -At -c "SELECT count(*) FROM chat_message WHERE chat_room_id BETWEEN 9601 AND 9610;"
