#!/usr/bin/env python3
"""소켓을 읽지 않는 수신자 (#111).

느린 소비자를 대역폭 제한 프록시로 흉내 내면 안 된다. 프록시가 서버 쪽
데이터를 자기 버퍼로 대신 읽어 주므로 서버의 TCP 는 막히지 않고, 세션
버퍼 · 전송 시간 상한 같은 보호가 영영 발동하지 않는다(실측으로 확인).
k6 도 수신을 항상 읽는다. 그래서 이 스크립트는 WebSocket 을 직접 열어
STOMP 구독까지만 하고 그 뒤로는 소켓을 읽지 않는다. TCP 수신창이 0이
되면 서버의 write 가 막히고, 그때부터가 진짜 느린 소비자다.

끊김 감지는 읽지 않고 한다. 10초마다 ping 프레임을 보내 보고, 서버가
세션을 끊었다면(RST) 전송이 실패한다. 그 시각을 기록한다.

사용: python3 load/clients/stalled-receiver.py --count 30 --hold 90
      (쌍 번호 21부터 count 개: 방 9421.., 회원은 각 쌍의 판매자)
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import socket
import time

SECRET = os.environ.get('JWT_SECRET', 'joying-local-secret-key-for-development-only')
HOST = os.environ.get('WS_HOST', 'localhost')
PORT = int(os.environ.get('WS_PORT', '8080'))


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def access_token(member_id: int) -> str:
    header = b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    now = int(time.time())
    payload = b64url(json.dumps({'sub': str(member_id), 'iat': now, 'exp': now + 3600}).encode())
    sig = b64url(hmac.new(SECRET.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
    return f'{header}.{payload}.{sig}'


def ws_frame(payload: bytes, opcode: int = 0x1) -> bytes:
    """클라이언트 프레임은 마스킹이 필수다."""
    mask = os.urandom(4)
    length = len(payload)
    if length < 126:
        head = bytes([0x80 | opcode, 0x80 | length])
    elif length < 65536:
        head = bytes([0x80 | opcode, 0x80 | 126]) + length.to_bytes(2, 'big')
    else:
        head = bytes([0x80 | opcode, 0x80 | 127]) + length.to_bytes(8, 'big')
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return head + mask + masked


def stomp(command: str, headers: dict, body: str = '') -> bytes:
    head = command + '\n' + ''.join(f'{k}:{v}\n' for k, v in headers.items())
    return (head + '\n' + body + '\x00').encode()


def open_stalled(room: int, member_id: int) -> socket.socket:
    s = socket.create_connection((HOST, PORT), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall((
        f'GET /ws/chat/websocket?roomId={room} HTTP/1.1\r\n'
        f'Host: {HOST}:{PORT}\r\n'
        'Upgrade: websocket\r\nConnection: Upgrade\r\n'
        f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
    ).encode())
    resp = s.recv(4096)
    if b'101' not in resp.split(b'\r\n', 1)[0]:
        raise RuntimeError(f'핸드셰이크 실패: {resp[:80]!r}')
    token = access_token(member_id)
    s.sendall(ws_frame(stomp('CONNECT', {
        'accept-version': '1.2', 'heart-beat': '0,0',
        'cookie': f'access_token={token}',
    })))
    # CONNECTED 는 받아야 구독이 선다. 여기까지만 읽고 그 뒤로는 읽지 않는다
    s.settimeout(10)
    s.recv(4096)
    s.sendall(ws_frame(stomp('SUBSCRIBE', {'id': 'sub-stall', 'destination': f'/user/queue/chat/{room}'})))
    s.settimeout(None)
    # 수신창을 빨리 채우려고 OS 수신 버퍼를 줄인다. 그래야 서버가 더 일찍 막힌다
    s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 16 * 1024)
    return s


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--count', type=int, default=30)
    ap.add_argument('--pair-base', type=int, default=21, help='시작 쌍 번호 (방 9400+pair)')
    ap.add_argument('--hold', type=int, default=90, help='버티는 초')
    args = ap.parse_args()

    socks = {}
    for i in range(args.count):
        pair = args.pair_base + i
        room = 9400 + pair
        member = 9300 + 2 * pair  # 판매자
        try:
            socks[room] = open_stalled(room, member)
        except Exception as e:  # noqa: BLE001 - 연결 실패도 결과다
            print(f'연결 실패 room={room}: {e}')
    print(f'읽지 않는 수신자 {len(socks)}명 대기 시작 ({time.strftime("%T")})')

    started = time.time()
    dropped = {}
    while time.time() - started < args.hold:
        time.sleep(10)
        for room, s in list(socks.items()):
            if room in dropped:
                continue
            try:
                s.sendall(ws_frame(b'', opcode=0x9))  # ping
            except OSError:
                dropped[room] = round(time.time() - started, 1)
    for s in socks.values():
        try:
            s.close()
        except OSError:
            pass
    print(f'결과: 연결 {len(socks)}명 중 서버가 끊은 것 {len(dropped)}명')
    if dropped:
        times = sorted(dropped.values())
        print(f'끊긴 시점(초): 최초 {times[0]} · 중앙 {times[len(times)//2]} · 최후 {times[-1]}')


if __name__ == '__main__':
    main()
