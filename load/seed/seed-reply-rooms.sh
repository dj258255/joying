#!/usr/bin/env bash
#
# 답장 비율과 답장이 가리키는 곳을 달리한 방 셋을 만든다.
#
# 목록 조회는 메시지마다 답장 대상을 따로 찾아왔다. 그것을 한 번에 모아 오도록
# 고쳤는데(docs/performance/message-list-nplus1.md), 그때 실험은 499건이 전부
# 같은 하나를 가리켰다. 모아 오는 이득이 가장 큰 조건이다.
#
# 전부 다른 것을 가리키면 조회는 여전히 한 번이지만 가져오는 양이 는다. 그것을
# 재려면 방이 셋 필요하다.
#
#   9101  메시지 500건, 답장 0건
#   9102  메시지 500건, 답장 499건 — 전부 같은 하나를 가리킨다
#   9103  메시지 500건, 답장 499건 — 각자 다른 것을 가리킨다
#
# 실행: load/seed/seed-reply-rooms.sh [컨테이너이름]
#
# 만든 뒤 재는 것:
#   ROOM=9101 JWT_SECRET=<서버와 같은 값> k6 run load/k6/message-list-nplus1.js
#   ROOM=9102 ... / ROOM=9103 ...
#
# is_deleted 를 false 로 박아 넣는 것이 중요하다. 목록 조회가 IsDeletedFalse 로
# 거르는데 NULL 은 거기에 걸리지 않아, 넣어도 한 건도 안 나온다.
set -euo pipefail

PG="${1:-joying-postgres}"
DB="${POSTGRES_DATABASE:-project_db}"
USER="${POSTGRES_USERNAME:-joying}"

# 방마다 사람 둘이 필요하다. 구매자와 판매자가 다른 사람이어야 방이 만들어진다
BUYER=9002
SELLER=9003

psql() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" -q "$@"; }

echo "방 9101 · 9102 · 9103 을 만든다 (컨테이너: $PG)"

psql <<'SQL'
-- 사람 둘. 이미 있으면 그대로 둔다
INSERT INTO member (member_id, nickname, email, rating, rating_count, created_at, updated_at)
VALUES (9002, '재는사람A', 'load-a@joying.test', 0, 0, NOW(), NOW()),
       (9003, '재는사람B', 'load-b@joying.test', 0, 0, NOW(), NOW())
ON CONFLICT (member_id) DO NOTHING;

-- 방 셋
INSERT INTO chat_room (chat_room_id, buyer_id, seller_id, status, created_at, updated_at)
VALUES (9101, 9002, 9003, 'ACTIVE', NOW(), NOW()),
       (9102, 9002, 9003, 'ACTIVE', NOW(), NOW()),
       (9103, 9002, 9003, 'ACTIVE', NOW(), NOW())
ON CONFLICT (chat_room_id) DO NOTHING;

INSERT INTO chat_room_member (chat_room_id, member_id, is_pinned, is_muted, is_left,
                              created_at, updated_at)
SELECT r, m, false, false, false, NOW(), NOW()
FROM (VALUES (9101), (9102), (9103)) AS rooms(r),
     (VALUES (9002), (9003)) AS members(m)
ON CONFLICT DO NOTHING;

-- 다시 만들 수 있게 지우고 시작한다
DELETE FROM chat_message WHERE chat_room_id IN (9101, 9102, 9103);

-- 9101: 답장 없음
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          is_deleted, is_edited, created_at)
SELECT '9101-' || i, 9101, i, 9002, 'TEXT', '메시지 ' || i, false, false,
       NOW() - (500 - i) * INTERVAL '1 second'
FROM generate_series(1, 500) AS i;

-- 9102: 첫 건 말고 전부가 같은 하나를 가리킨다
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          reply_to_message_id, is_deleted, is_edited, created_at)
SELECT '9102-' || i, 9102, i, 9002, 'TEXT', '메시지 ' || i,
       CASE WHEN i = 1 THEN NULL ELSE '9102-1' END, false, false,
       NOW() - (500 - i) * INTERVAL '1 second'
FROM generate_series(1, 500) AS i;

-- 9103: 각자 바로 앞의 것을 가리킨다. 499개가 전부 다르다
INSERT INTO chat_message (id, chat_room_id, sequence, sender_id, type, content,
                          reply_to_message_id, is_deleted, is_edited, created_at)
SELECT '9103-' || i, 9103, i, 9002, 'TEXT', '메시지 ' || i,
       CASE WHEN i = 1 THEN NULL ELSE '9103-' || (i - 1) END, false, false,
       NOW() - (500 - i) * INTERVAL '1 second'
FROM generate_series(1, 500) AS i;
SQL

echo
echo "만들어진 것:"
psql -c "
SELECT chat_room_id AS 방,
       count(*) AS 메시지,
       count(reply_to_message_id) AS 답장,
       count(DISTINCT reply_to_message_id) AS \"가리키는 곳\"
FROM chat_message
WHERE chat_room_id IN (9101, 9102, 9103)
GROUP BY chat_room_id ORDER BY chat_room_id;"
