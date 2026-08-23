import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 1:1 채팅의 실제 지형에서 순서가 어긋나는지 잰다.
 *
 * <p>앞선 두 노드 실험은 한 사람이 연결 여덟 개로 동시에 보내는 상황이었다. 이 서비스는
 * 1:1 이라 한 방에 말할 수 있는 사람이 둘뿐이다. 방은 상품과 구매자와 판매자로 유일하고
 * 참여자는 둘로 고정된다. 여덟이 동시에 보내는 일은 일어나지 않는다.
 *
 * <p>그래서 다시 잰다. 구매자는 1번 노드에, 판매자는 2번 노드에 붙는다. 두 사람이 동시에
 * 말을 걸고, 각자 자기가 받는 순서를 센다.
 *
 * <p>이 배치가 이 서비스에서 가능한 가장 나쁜 경우다. 두 사람이 다른 노드에 있으면 두 노드가
 * 각자 Redis 에 발행하므로 도착 순서가 번호 순서와 다를 수 있다.
 *
 * 실행: k6 run load/k6/one-to-one-two-node.js
 */

const BUYER_BASE = __ENV.BUYER_BASE || 'ws://localhost:8080';
const SELLER_BASE = __ENV.SELLER_BASE || 'ws://localhost:8081';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ROOM = __ENV.ROOM || '9001';
const PER_PERSON = Number(__ENV.PER_PERSON || 100);
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 40000);

const inversions = new Counter('order_inversions');
const received = new Counter('messages_received');
const missing = new Counter('messages_missing');
const roundTrip = new Trend('message_round_trip', true);

export const options = {
  scenarios: {
    buyer: {
      executor: 'per-vu-iterations',
      exec: 'buyer',
      vus: 1,
      iterations: 1,
      maxDuration: '120s',
    },
    seller: {
      executor: 'per-vu-iterations',
      exec: 'seller',
      vus: 1,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    messages_missing: ['count==0'],
    // 0 이어도 표에 뜨게 한다. 안 뜨면 "0" 과 "재지 않음" 을 구분할 수 없다
    order_inversions: ['count>=0'],
  },
};

export function setup() {
  return { runId: String(Date.now()) };
}

export function buyer(data) {
  talk(data, BUYER_BASE, 9001, 'load-a@joying.test', 'buyer');
}

export function seller(data) {
  talk(data, SELLER_BASE, 9002, 'load-b@joying.test', 'seller');
}

/**
 * 붙어서 말을 걸고, 동시에 받는 순서를 센다.
 *
 * <p>1:1 이므로 두 사람 다 보내면서 받는다. 한쪽만 관찰자로 두면 실제 모습과 다르다.
 */
function talk(data, base, memberId, email, role) {
  const token = accessToken(memberId, email, SECRET);
  let lastSequence = 0;
  let seen = 0;

  ws.connect(base + '/ws/chat/websocket', {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-' + role, '/user/queue/chat/' + ROOM));

          // 구독이 자리를 잡을 시간을 준 뒤 둘이 같이 출발한다. 바로 보내면 자기 것도
          // 못 받고, 한쪽이 먼저 출발하면 겹치는 구간이 줄어든다
          socket.setTimeout(function () {
            for (let i = 0; i < PER_PERSON; i++) {
              socket.send(
                stomp.send('/app/chat/' + ROOM + '/send', {
                  type: 'TEXT',
                  content: role + '-' + i + '|' + Date.now(),
                  clientMessageId: data.runId + '-' + role + '-' + i,
                })
              );
            }
          }, 2000);
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
      // 두 사람이 각 PER_PERSON 건씩 보내고, 둘 다 양쪽 것을 모두 받는다
      const expected = PER_PERSON * 2;
      if (seen < expected) {
        missing.add(expected - seen);
      }
      check(seen, { '양쪽 것을 모두 받았다': (n) => n >= expected });
      socket.close();
    }, OBSERVE_MS);
  });
}
