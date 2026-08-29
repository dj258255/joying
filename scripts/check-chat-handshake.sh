#!/usr/bin/env bash
#
# 채팅이 실제로 붙는지 확인한다.
#
# 배포가 끝났다고 채팅이 되는 것은 아니다. 앞단이 방 번호를 열쇠로 쓰고 경로에서
# 걷어내는데, 그 사이에 무엇 하나가 어긋나면 화면에서만 조용히 안 붙는다.
#
# SockJS 의 xhr-streaming 전송은 그냥 HTTP 다. 브라우저 없이 여기서 끝까지 지나 본다.
#   1) /info 로 SockJS 가 이 주소에서 살아 있는지
#   2) 세션을 열고
#   3) STOMP CONNECT 를 보내 CONNECTED 가 돌아오는지
#
# 실행: scripts/check-chat-handshake.sh [주소] [방번호]
#
# 기본 주소가 localhost 가 아니라 127.0.0.1 인 이유는, localhost 가 IPv6 ::1 로 먼저
# 풀리기 때문이다. compose 는 IPv4 에만 묶으므로, 이 기계의 IPv6 같은 포트에 다른 것이
# 떠 있으면 그쪽을 보고 잘 됐다고 적게 된다.
set -uo pipefail

BASE_URL="${1:-https://127.0.0.1}"
ROOM="${2:-9001}"
SERVER="$(( RANDOM % 900 + 100 ))"
SESSION="$(head -c 8 /dev/urandom | xxd -p)"
SOCK="${BASE_URL}/ws/chat/${ROOM}/${SERVER}/${SESSION}"
STREAM_OUT="$(mktemp)"
trap 'rm -f "$STREAM_OUT"' EXIT

fail() { echo "  [실패] $1"; exit 1; }

echo "방 ${ROOM} 로 붙어 본다: ${BASE_URL}"

# 1) SockJS 가 이 주소에서 살아 있나
info_code="$(curl -sk -o /dev/null -w '%{http_code}' "${BASE_URL}/ws/chat/${ROOM}/info")"
[ "$info_code" = "200" ] || fail "/ws/chat/${ROOM}/info 가 ${info_code} 다"
echo "  [통과] /ws/chat/${ROOM}/info 200"

# 2) 세션을 연다. 열리면 SockJS 가 o 를 보낸다
curl -sk -N -X POST "${SOCK}/xhr_streaming" > "$STREAM_OUT" 2>&1 &
stream_pid=$!
sleep 2

grep -q '^o$' "$STREAM_OUT" || { kill $stream_pid 2>/dev/null; fail "세션이 열리지 않았다"; }
echo "  [통과] 세션이 열렸다"

# 3) STOMP CONNECT.
#
#    프레임 끝은 NUL 이다. 그런데 SockJS 는 프레임을 JSON 배열에 담아 나르고,
#    JSON 문자열 안에 NUL 바이트를 그대로 넣으면 무효라 뒤쪽이 통째로 버린다.
#    여섯 글자짜리 \u0000 으로 적어야 한다.
send_code="$(curl -sk -o /dev/null -w '%{http_code}' -X POST "${SOCK}/xhr_send" \
  -H 'Content-Type: application/json' \
  --data-binary '["CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\u0000"]')"
[ "$send_code" = "204" ] || { kill $stream_pid 2>/dev/null; fail "CONNECT 를 못 보냈다 (${send_code})"; }

sleep 2
kill $stream_pid 2>/dev/null
wait $stream_pid 2>/dev/null

if grep -q 'CONNECTED' "$STREAM_OUT"; then
  echo "  [통과] STOMP CONNECTED"
  echo
  echo "채팅이 붙는다."
else
  echo "  [실패] CONNECTED 가 돌아오지 않았다"
  echo "  받은 것:"
  head -c 300 "$STREAM_OUT" | sed 's/^/    /'
  exit 1
fi
