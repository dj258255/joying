#!/usr/bin/env bash
#
# 노드를 늘리거나 줄일 때 방이 얼마나 다른 노드로 옮겨 가는지 잰다.
#
# infra/nginx.conf 가 `hash $chat_room_key consistent` 를 쓰는 이유는 이 순간 때문이다.
# 그 근거를 재지 않은 채로 두었어서 여기서 잰다. 같은 조건에서 consistent 를 뺀 것과
# 나란히 돌린다. 비교 대상이 없으면 나온 값이 좋은 것인지 알 수 없다.
#
# 실행: load/routing/measure.sh
set -euo pipefail

cd "$(dirname "$0")"

ROOMS="${ROOMS:-2000}"          # 방 몇 개를 보내 볼지
FRONT="http://localhost:18080"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 앞단 설정을 바꾸고 다시 읽힌다.
#
# $1 = consistent 를 붙일지 ("consistent" 또는 "")
# 나머지 = 업스트림에 둘 노드 이름
apply() {
  local method="$1"; shift
  {
    echo "upstream chat_backend {"
    echo "    hash \$arg_roomId ${method};"
    for node in "$@"; do
      echo "    server ${node}:80;"
    done
    echo "}"
    echo "server { listen 80; location / { proxy_pass http://chat_backend; } }"
  } > "$WORK/front.conf"

  docker compose cp "$WORK/front.conf" front:/etc/nginx/conf.d/default.conf >/dev/null 2>&1
  docker compose exec -T front nginx -s reload >/dev/null 2>&1
  sleep 1
}

# 방 1..ROOMS 이 각각 어느 노드로 갔는지 적는다
probe() {
  seq 1 "$ROOMS" \
    | xargs -P 32 -I{} sh -c "printf '%s %s\n' {} \"\$(curl -s --max-time 5 '$FRONT/?roomId={}')\"" \
    | sort -n > "$1"
}

# 두 배치 사이에서 노드가 바뀐 방의 수
moved() {
  join "$1" "$2" | awk '$2 != $3 { n++ } END { print n + 0 }'
}

run_case() {
  local label="$1" method="$2"; shift 2

  apply "$method" node1 node2
  probe "$WORK/two"

  apply "$method" node1 node2 node3
  probe "$WORK/three"

  local out_moved; out_moved="$(moved "$WORK/two" "$WORK/three")"

  # 옮겨 간 방이 전부 새 노드로 간 것인지, 아니면 멀쩡히 있던 노드끼리도
  # 자리를 바꿨는지 가른다. 뒤엣것은 끊을 이유가 없는 연결을 끊는 것이다
  local to_new; to_new="$(join "$WORK/two" "$WORK/three" | awk '$2 != $3 && $3 == "node3" { n++ } END { print n + 0 }')"
  local between_old; between_old="$(join "$WORK/two" "$WORK/three" | awk '$2 != $3 && $3 != "node3" { n++ } END { print n + 0 }')"
  printf '  %-12s 옮겨 간 %d 중 새 노드로 %d, 있던 노드끼리 %d\n' "$label" "$out_moved" "$to_new" "$between_old"

  apply "$method" node1 node2
  probe "$WORK/back"

  local in_moved; in_moved="$(moved "$WORK/three" "$WORK/back")"

  printf '%-14s 2→3 노드: %5d / %d (%.1f%%)   3→2 노드: %5d / %d (%.1f%%)\n' \
    "$label" \
    "$out_moved" "$ROOMS" "$(echo "scale=4; $out_moved * 100 / $ROOMS" | bc)" \
    "$in_moved"  "$ROOMS" "$(echo "scale=4; $in_moved * 100 / $ROOMS" | bc)"
}

# 방이 노드에 고르게 흩어지는지도 함께 본다. 전부 한 노드로 몰리면 옮겨 간 방이
# 적은 것이 좋은 뜻이 아니다.
spread() {
  local method="$1"
  apply "$method" node1 node2 node3
  probe "$WORK/spread"
  printf '  노드별 방 수 (3 노드): '
  awk '{ c[$2]++ } END { for (n in c) printf "%s=%d ", n, c[n]; print "" }' "$WORK/spread" | tr -d '\n'
  echo
}

echo "방 ${ROOMS}개를 보내 노드가 바뀐 수를 센다"
echo

docker compose up -d --wait >/dev/null 2>&1 || docker compose up -d >/dev/null
sleep 2

run_case "consistent"  "consistent"
spread "consistent"
echo
run_case "그냥 hash"   ""
spread ""

echo
docker compose down >/dev/null 2>&1
