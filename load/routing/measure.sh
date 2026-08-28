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
    # 열쇠를 고르는 방법을 운영(infra/nginx.conf)과 같게 둔다.
    #
    # 처음에는 이 map 을 빼고 $arg_roomId 로만 해시했다. 그 상태에서는 쿠키가
    # 값에 아무 영향이 없어, 탭 실험이 "아무 문제 없다"고 나왔다. 재는 자리에
    # 열쇠가 빠져 있었다. 상황 21 에서 겪은 것과 같다.
    echo 'map $cookie_chat_room $chat_room_key {'
    echo '    ""      $arg_roomId;'
    echo '    default $cookie_chat_room;'
    echo '}'
    echo "upstream chat_backend {"
    echo "    hash \$chat_room_key ${method};"
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


# ────────────────────────────────────────────────────────────────────────
# 한 노드가 죽으면 어디가 흔들리나
#
# 늘리고 줄이는 것은 우리가 정해서 하는 일이다. 죽는 것은 아니다. 죽은 노드가
# 들고 있던 방은 어디론가 가야 하지만, 멀쩡한 노드의 방까지 흔들리면 안 된다.
# ────────────────────────────────────────────────────────────────────────
run_node_down() {
  local label="$1" method="$2"

  apply "$method" node1 node2 node3
  probe "$WORK/alive"

  docker compose stop node2 >/dev/null 2>&1
  sleep 1
  probe "$WORK/dead"
  docker compose start node2 >/dev/null 2>&1
  sleep 2

  # node2 를 보던 방은 옮겨 갈 수밖에 없다. 나머지가 흔들렸는지가 문제다
  local was_on_dead; was_on_dead="$(awk '$2 == "node2" { n++ } END { print n + 0 }' "$WORK/alive")"
  local others_moved; others_moved="$(join "$WORK/alive" "$WORK/dead" \
    | awk '$2 != "node2" && $2 != $3 { n++ } END { print n + 0 }')"

  printf '%-14s 죽은 노드가 보던 방 %4d개는 옮겨 간다.  멀쩡한 노드의 방 중 흔들린 것: %d\n' \
    "$label" "$was_on_dead" "$others_moved"
}

# ────────────────────────────────────────────────────────────────────────
# 탭을 둘 열어 서로 다른 방을 볼 때
#
# 앞단은 쿠키를 먼저 보고 없을 때만 쿼리스트링을 본다. 쿠키는 브라우저에 하나다.
# 방 A 를 보다가 탭을 열어 방 B 를 보면, B 요청에 A 의 쿠키가 따라붙는다.
# ────────────────────────────────────────────────────────────────────────
run_two_tabs() {
  apply "consistent" node1 node2 node3
  probe "$WORK/bykey"

  local pairs=0 wrong=0 a b node_a node_b landed
  for _ in $(seq 1 500); do
    a=$(( (RANDOM % ROOMS) + 1 ))
    b=$(( (RANDOM % ROOMS) + 1 ))
    [ "$a" = "$b" ] && continue
    pairs=$((pairs + 1))

    node_a="$(awk -v r="$a" '$1 == r { print $2 }' "$WORK/bykey")"
    node_b="$(awk -v r="$b" '$1 == r { print $2 }' "$WORK/bykey")"

    # 방 B 를 보는 탭인데 쿠키에는 방 A 가 들어 있다
    landed="$(curl -s --max-time 5 -H "Cookie: chat_room=${a}" "$FRONT/?roomId=${b}")"
    if [ "$landed" != "$node_b" ]; then
      wrong=$((wrong + 1))
    fi
  done

  printf '탭 둘        %d쌍 중 %d쌍이 방 B 를 엉뚱한 노드로 보낸다 (%.1f%%)\n' \
    "$pairs" "$wrong" "$(echo "scale=4; $wrong * 100 / $pairs" | bc)"
}

echo
echo "── 한 노드가 죽었을 때 ──"
run_node_down "consistent" "consistent"
run_node_down "그냥 hash"  ""

echo
echo "── 탭을 둘 열어 서로 다른 방을 볼 때 (노드 3개, consistent) ──"
run_two_tabs

echo
docker compose down >/dev/null 2>&1
