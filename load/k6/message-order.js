import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 웹소켓으로 실제 부하를 넣으면서 순서가 지켜지는지 본다.
 *
 * 단위 테스트에서는 저장소에 직접 넣어 재 봤다. 그것으로는 저장 시각이 순서를 정하지
 * 못한다는 것까지만 보인다. 여기서는 사람이 쓰는 경로 그대로, 여러 사람이 같은 방에
 * 붙어 동시에 말을 걸 때 받는 쪽이 보는 순서를 잰다.
 *
 * 두 가지를 함께 센다.
 *   - 받은 순서에서 번호가 뒤로 간 횟수. 서버가 정한 순서와 화면에 닿는 순서가 다른 지점
 *   - 보낸 것 중 돌아오지 않은 것. 부하에서 조용히 사라지는 것이 있는지
 *
 * 실행: k6 run load/k6/message-order.js
 */

const BASE = __ENV.BASE || 'ws://localhost:8080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ROOM = __ENV.ROOM || '9001';
const SENDERS = Number(__ENV.SENDERS || 8);
const PER_SENDER = Number(__ENV.PER_SENDER || 25);
// 관찰자가 기다리는 시간. 느린 것과 잃는 것을 가르려면 넉넉히 줘야 한다
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 25000);

const inversions = new Counter('order_inversions');
const received = new Counter('messages_received');
const missing = new Counter('messages_missing');
const roundTrip = new Trend('message_round_trip', true);

export const options = {
  scenarios: {
    // 받는 사람 하나가 방에 붙어 순서를 관찰한다
    observer: {
      executor: 'per-vu-iterations',
      exec: 'observe',
      vus: 1,
      iterations: 1,
      maxDuration: '180s',
    },
    // 보내는 사람들이 동시에 말을 건다. 관찰자가 먼저 붙도록 조금 늦춘다
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
    // 서버가 순서를 정하므로 뒤집힘은 하나도 없어야 한다
    order_inversions: ['count==0'],
    messages_missing: ['count==0'],
  },
};

const OBSERVER = { id: 9002, email: 'load-b@joying.test' };

/**
 * 실행마다 다른 꼬리표를 만든다.
 *
 * 전송 식별자를 실행마다 같은 값으로 두면 두 번째 실행부터 멱등이 걸려 서버가
 * 예전에 저장한 것을 그대로 돌려준다. 그러면 예전 번호를 새 번호와 섞어서 세게
 * 되고, 고쳐도 수치가 안 움직인다. 처음에 이것 때문에 193이 그대로였다.
 */
export function setup() {
  return { runId: String(Date.now()) };
}

export function observe(data) {
  const token = accessToken(OBSERVER.id, OBSERVER.email, SECRET);
  const url = BASE + '/ws/chat/websocket';

  let lastSequence = 0;
  let seen = 0;

  ws.connect(url, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          // 메시지는 방 토픽이 아니라 사람별 큐로 간다. 서버가 보낸 사람과 받는
          // 사람에게 각각 따로 내보낸다
          socket.send(stomp.subscribe('sub-order', '/user/queue/chat/' + ROOM));
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
        if (__ENV.DUMP && seen <= 40) {
          console.log('recv#' + seen + ' seq=' + payload.sequence + ' c=' + String(payload.content).split('|')[0]);
        }

        // 받은 순서에서 번호가 뒤로 갔다면, 화면에 닿는 순서가 서버가 정한 순서와
        // 다르다는 뜻이다
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
      check(seen, {
        '보낸 것이 전부 돌아왔다': (n) => n >= expected,
      });
      socket.close();
    }, OBSERVE_MS);
  });
}

export function sendBurst(data) {
  const me = 9001;
  const token = accessToken(me, 'load-a@joying.test', SECRET);
  const url = BASE + '/ws/chat/websocket';

  ws.connect(url, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command !== 'CONNECTED') {
          return;
        }
        // 붙자마자 몰아서 보낸다. 같은 밀리초에 여러 건이 겹치게 하는 것이 목적이다
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
        }, 15000);
      });
    });
  });
}
