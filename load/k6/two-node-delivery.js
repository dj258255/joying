import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 서버가 두 대일 때 순서가 유지되는지 잰다.
 *
 * <p>앞선 실험은 전부 한 대에서 했다. 순서를 지키려고 만든 장치는 전부 그 한 대
 * 안에 있다. 들어오는 채널을 연결 단위로 묶은 것도, 방 단위로 한 줄로 세운 것도,
 * 나가는 채널의 발행 순서를 켠 것도 모두 한 프로세스 안의 이야기다.
 *
 * <p>서버가 둘이면 그 사이에 Redis 를 건너는 구간이 하나 더 생긴다. 보내는 사람이
 * 1번 서버에, 받는 사람이 2번 서버에 붙어 있으면 메시지는 1번에서 저장되고 Redis 를
 * 지나 2번에서 나간다. 그 구간이 순서를 지키는지는 재 본 적이 없다.
 *
 * <p>보내는 사람을 전부 1번 서버에 붙이고 받는 사람만 2번 서버에 붙인다. 그래야
 * 반드시 Redis 를 건넌다. 한 대에 섞어 붙이면 일부는 서버 안에서 끝나 구간이 갈린다.
 *
 * 실행: k6 run load/k6/two-node-delivery.js
 */

const SENDER_BASE = __ENV.SENDER_BASE || 'ws://localhost:8080';
// 보내는 사람을 두 노드에 갈라 붙일 때 쓴다. 갈리면 두 노드가 각자 Redis 에 발행하므로
// 도착 순서가 번호 순서와 다를 수 있다. 그것이 이 설계의 진짜 경계다
const SENDER_BASE_2 = __ENV.SENDER_BASE_2 || '';
const OBSERVER_BASE = __ENV.OBSERVER_BASE || 'ws://localhost:8081';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ROOM = __ENV.ROOM || '9001';
const SENDERS = Number(__ENV.SENDERS || 8);
const PER_SENDER = Number(__ENV.PER_SENDER || 25);
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 90000);

const inversions = new Counter('order_inversions');
const received = new Counter('messages_received');
const missing = new Counter('messages_missing');
const roundTrip = new Trend('message_round_trip', true);

export const options = {
  scenarios: {
    observer: {
      executor: 'per-vu-iterations',
      exec: 'observe',
      vus: 1,
      iterations: 1,
      maxDuration: '180s',
    },
    senders: {
      executor: 'per-vu-iterations',
      exec: 'sendBurst',
      vus: SENDERS,
      iterations: 1,
      startTime: '3s',
      maxDuration: '180s',
    },
  },
  thresholds: {
    order_inversions: ['count==0'],
    messages_missing: ['count==0'],
  },
};

export function setup() {
  return { runId: String(Date.now()) };
}

export function observe(data) {
  // 받는 사람만 2번 서버에 붙는다. 그래야 메시지가 반드시 Redis 를 건넌다
  const token = accessToken(9002, 'load-b@joying.test', SECRET);
  let lastSequence = 0;
  let seen = 0;

  ws.connect(OBSERVER_BASE + '/ws/chat/websocket', {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-two-node', '/user/queue/chat/' + ROOM));
          return;
        }
        if (f.command !== 'MESSAGE' || !f.body) {
          return;
        }

        let payload;
        try {
          payload = JSON.parse(f.body);
        } catch (e) {
          return;
        }
        if (payload.sequence == null) {
          return;
        }

        seen++;
        received.add(1);

        if (payload.sequence < lastSequence) {
          inversions.add(1);
        }
        lastSequence = Math.max(lastSequence, payload.sequence);

        if (payload.content) {
          const sentAt = Number(String(payload.content).split('|')[1]);
          if (sentAt) {
            roundTrip.add(Date.now() - sentAt);
          }
        }
      });
    });

    socket.setTimeout(function () {
      const expected = SENDERS * PER_SENDER;
      if (seen < expected) {
        missing.add(expected - seen);
      }
      check(seen, { '보낸 것이 전부 돌아왔다': (n) => n >= expected });
      socket.close();
    }, OBSERVE_MS);
  });
}

export function sendBurst(data) {
  // 보내는 사람은 전부 1번 서버에 붙는다
  const token = accessToken(9001, 'load-a@joying.test', SECRET);

  // 갈라 붙이라고 했으면 홀짝으로 나눈다
  const base = SENDER_BASE_2 && __VU % 2 === 0 ? SENDER_BASE_2 : SENDER_BASE;

  ws.connect(base + '/ws/chat/websocket', {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command !== 'CONNECTED') {
          return;
        }
        for (let i = 0; i < PER_SENDER; i++) {
          socket.send(
            stomp.send('/app/chat/' + ROOM + '/send', {
              type: 'TEXT',
              content: 'vu' + __VU + '-' + i + '|' + Date.now(),
              clientMessageId: data.runId + '-vu' + __VU + '-' + i,
            })
          );
        }
        socket.setTimeout(function () {
          socket.close();
        }, 20000);
      });
    });
  });
}
