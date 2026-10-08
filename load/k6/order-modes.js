import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';
import { createHoldback } from './lib/holdback.js';

/**
 * 순서를 어디서 복원하는지에 따라 무엇이 달라지는지 한 스크립트로 잰다 (#91).
 *
 * 세 방식이 비교 대상이다.
 *   A 스티키(현행):   앞단이 방을 같은 노드에 묶는다. 배치로 흉내 낸다
 *   B 서버 중재:      서버를 CHAT_ORDERING_MODE=arbiter 로 띄우고 배치는 cross
 *   C 클라이언트 보류: HOLD_MS 를 주면 받는 쪽이 번호 순으로만 방출한다
 *
 * 배치(ASSIGN)가 노드를 정한다.
 *   concentrate  모든 쌍이 1번 노드에 붙는다. 스티키가 강제하는 집중의 극단
 *   sticky       쌍마다 같은 노드, 방 홀짝으로 노드를 가른다. 스티키의 정상 모습
 *   cross        구매자는 1번, 판매자는 2번 노드. 분산의 최악 배치
 *
 * 세는 것 둘을 구분한다.
 *   order_inversions    도착(수신) 순서의 뒤집힘. 기존 실험들과 같은 정의
 *   release_inversions  보류 버퍼를 지나 방출된 순서의 뒤집힘. C 의 판정 대상
 * C 의 대가는 buffer_wait(방출까지 쥐고 있던 시간)와 gap_give_up(기다리다 건너뛴
 * 번호 자리)으로 나타난다.
 *
 * 실행 예 (쌍 하나, 기존 방 9001):
 *   k6 run load/k6/order-modes.js
 * 실행 예 (쌍 10개, 분산 배치, 보류 2초):
 *   PAIRS=10 ASSIGN=cross HOLD_MS=2000 k6 run load/k6/order-modes.js
 * 쌍을 여러 개 쓰려면 먼저 load/seed/seed-order-rooms.sh 로 방을 만든다.
 */

const NODE1 = __ENV.NODE1 || 'ws://localhost:8080';
const NODE2 = __ENV.NODE2 || 'ws://localhost:8081';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ASSIGN = __ENV.ASSIGN || 'cross';
const HOLD_MS = Number(__ENV.HOLD_MS || 0);
const PAIRS = Number(__ENV.PAIRS || 1);
const PER_PERSON = Number(__ENV.PER_PERSON || 100);
const SEND_GAP_MS = Number(__ENV.SEND_GAP_MS || 0);
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 40000);

// 쌍 하나면 기존 실험들이 쓰던 방 9001(회원 9001·9002)을 그대로 쓴다.
// 여러 쌍이면 seed-order-rooms.sh 가 만든 방 9401.. 과 회원 9301.. 을 쓴다
const SINGLE_ROOM = __ENV.ROOM || '9001';

const wireInversions = new Counter('order_inversions');
const releaseInversions = new Counter('release_inversions');
const gapGiveUps = new Counter('gap_give_up');
const bufferWait = new Trend('buffer_wait', true);
const received = new Counter('messages_received');
const missing = new Counter('messages_missing');
const roundTrip = new Trend('message_round_trip', true);
const releasedRoundTrip = new Trend('released_round_trip', true);

export const options = {
  scenarios: {
    pairs: {
      executor: 'per-vu-iterations',
      vus: PAIRS * 2,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    messages_missing: ['count==0'],
    // 0 이어도 표에 뜨게 한다. 안 뜨면 "0" 과 "재지 않음" 을 구분할 수 없다
    order_inversions: ['count>=0'],
    release_inversions: ['count>=0'],
    gap_give_up: ['count>=0'],
  },
};

export function setup() {
  return { runId: String(Date.now()) };
}

function placement(pairIndex, role) {
  if (ASSIGN === 'concentrate') {
    return NODE1;
  }
  if (ASSIGN === 'sticky') {
    return pairIndex % 2 === 1 ? NODE1 : NODE2;
  }
  // cross: 두 사람이 노드를 달리한다. 이 서비스에서 가능한 가장 나쁜 배치다
  return role === 'buyer' ? NODE1 : NODE2;
}

export default function (data) {
  const pairIndex = Math.ceil(__VU / 2);
  const role = __VU % 2 === 1 ? 'buyer' : 'seller';

  let room;
  let memberId;
  if (PAIRS === 1) {
    room = SINGLE_ROOM;
    memberId = role === 'buyer' ? 9001 : 9002;
  } else {
    room = String(9400 + pairIndex);
    memberId = 9300 + pairIndex * 2 - (role === 'buyer' ? 1 : 0);
  }

  const base = placement(pairIndex, role);
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);

  let lastWireSequence = 0;
  let seen = 0;

  const holdback = HOLD_MS > 0
    ? createHoldback(HOLD_MS, function (payload, waitedMs, inverted) {
        if (inverted) {
          releaseInversions.add(1);
        }
        bufferWait.add(waitedMs);
        if (payload.content) {
          const sentAt = Number(String(payload.content).split('|')[1]);
          if (sentAt) {
            // 방출 시각 기준이라 버퍼에 쥐고 있던 시간이 이미 들어 있다.
            // waitedMs 를 더하면 이중으로 세게 된다
            releasedRoundTrip.add(Date.now() - sentAt);
          }
        }
      })
    : null;

  // 방 번호를 실어 보낸다. 원시 웹소켓이라 쿼리스트링을 쓰고 앞단이 이 값을 읽는다.
  // 노드에 직접 붙는 실행에서는 라우팅에 쓰이지 않지만 경로는 같게 지난다
  ws.connect(base + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-' + role, '/user/queue/chat/' + room));

          // 구독이 자리를 잡을 시간을 준 뒤 둘이 같이 출발한다
          socket.setTimeout(function () {
            let i = 0;
            const sendNext = function () {
              socket.send(
                stomp.send('/app/chat/' + room + '/send', {
                  type: 'TEXT',
                  content: role + '-' + i + '|' + Date.now(),
                  clientMessageId: data.runId + '-' + room + '-' + role + '-' + i,
                })
              );
              i++;
              if (i < PER_PERSON && SEND_GAP_MS > 0) {
                socket.setTimeout(sendNext, SEND_GAP_MS);
              } else if (i < PER_PERSON) {
                sendNext();
              }
            };
            sendNext();
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

        if (payload.sequence < lastWireSequence) {
          wireInversions.add(1);
        }
        lastWireSequence = Math.max(lastWireSequence, payload.sequence);

        if (payload.content) {
          const sentAt = Number(String(payload.content).split('|')[1]);
          if (sentAt) {
            roundTrip.add(Date.now() - sentAt);
          }
        }

        if (holdback) {
          holdback.accept(payload.sequence, payload, Date.now());
        }
      });
    });

    if (holdback) {
      socket.setInterval(function () {
        holdback.tick(Date.now());
      }, 100);
    }

    socket.setTimeout(function () {
      if (holdback) {
        holdback.flush(Date.now());
        gapGiveUps.add(holdback.stats.gapGiveUps);
      }
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
