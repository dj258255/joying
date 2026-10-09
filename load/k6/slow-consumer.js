import ws from 'k6/ws';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 수신이 느린 클라이언트가 남의 방을 미는 조건을 찾는다 (#111).
 *
 * 역할 셋.
 *   피해자 쌍 (VICTIM_PAIRS 쌍)  정상 연결로 주고받고 전달 왕복을 잰다. 느린
 *                               수신자들과 방이 다르다. 이들이 밀리면 전파다
 *   느린 수신자 (SLOW_COUNT 명)  대역폭을 조인 프록시(SLOW_BASE)로 붙어 구독만
 *                               한다. k6 는 수신을 즉시 읽으므로 "느림"은 k6 가
 *                               아니라 네트워크 계층(toxiproxy bandwidth)이 만든다
 *   먹이 주기 (느린 방마다 1명)  정상 연결로 느린 수신자의 방에 몰아 보내 세션
 *                               전송 버퍼를 채운다
 *
 * 세는 것: 피해자 전달 왕복(victim_round_trip), 피해자 유실, 느린 수신자의 연결
 * 종료 수(slow_disconnects. 서버가 버퍼 · 시간 상한에서 끊으면 여기에 잡힌다).
 *
 * 전제: load/seed/seed-order-rooms.sh 60 (피해자 방 9401~, 느린 방 9421~),
 *       load/toxiproxy/setup.sh up && setup.sh slow-ws 8
 *
 * 실행 예 (기준선 · 1명 · 30명):
 *   SLOW_COUNT=0 k6 run load/k6/slow-consumer.js
 *   SLOW_COUNT=1 k6 run load/k6/slow-consumer.js
 *   SLOW_COUNT=30 k6 run load/k6/slow-consumer.js
 */

const NODE = __ENV.NODE || 'ws://localhost:8080';
const SLOW_BASE = __ENV.SLOW_BASE || 'ws://localhost:38080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const VICTIM_PAIRS = Number(__ENV.VICTIM_PAIRS || 5);
const SLOW_COUNT = Number(__ENV.SLOW_COUNT || 1);
// 먹이만 따로 띄울 수 있다(느린 수신자를 k6 밖의 '읽지 않는 클라이언트'가 맡을 때)
const FEEDER_COUNT = Number(__ENV.FEEDER_COUNT !== undefined ? __ENV.FEEDER_COUNT : SLOW_COUNT);
const FEED_COUNT = Number(__ENV.FEED_COUNT || 600);
const PER_PERSON = Number(__ENV.PER_PERSON || 50);
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 40000);
// 피해자의 송신 간격. 0이면 몰아 보낸다(#111 조건). 사람 속도의 대화를 흉내 낼
// 때는 300ms 쯤을 준다(#118 조건). 몰아 보내기는 그 자체가 속도 제한에 걸린다
const VICTIM_INTERVAL_MS = Number(__ENV.VICTIM_INTERVAL_MS || 0);

// 느린 쌍은 피해자 뒤 번호를 쓴다. 방 9421.., 수신자는 쌍의 판매자
const SLOW_ROOM_OFFSET = 20;

const victimRt = new Trend('victim_round_trip', true);
const victimReceived = new Counter('victim_received');
const victimMissing = new Counter('victim_missing');
const slowDisconnects = new Counter('slow_disconnects');
const slowReceived = new Counter('slow_received');
const fed = new Counter('fed_messages');

// 역할별로 k6 프로세스를 따로 띄운다 (ROLE=victims | receivers | feeders).
// 한 프로세스에 시나리오를 섞으면 __VU 가 전역 번호라 역할 안 번호를 복원할
// 결정적 방법이 없다. 실제로 idInScenario 라는 없는 속성을 썼다가 방 번호가
// 전부 깨져 피해자 수신이 0이 된 실행을 버렸다.
const ROLE = __ENV.ROLE || 'victims';

const ROLE_VUS = {
  victims: VICTIM_PAIRS * 2,
  receivers: SLOW_COUNT,
  feeders: FEEDER_COUNT,
};

export const options = {
  scenarios: {
    [ROLE]: {
      executor: 'per-vu-iterations',
      exec: ROLE === 'victims' ? 'victim' : ROLE === 'receivers' ? 'slowReceiver' : 'feeder',
      vus: Math.max(1, ROLE_VUS[ROLE]),
      iterations: 1,
      maxDuration: '150s',
    },
  },
  thresholds: {
    ...(ROLE === 'victims' ? { victim_missing: ['count==0'] } : {}),
    // 0 이어도 표에 뜨게 한다. "0" 과 "재지 않음" 을 구분하기 위해서다
    slow_disconnects: ['count>=0'],
    slow_received: ['count>=0'],
    fed_messages: ['count>=0'],
  },
};

export function setup() {
  return { runId: String(Date.now()) };
}

/** 피해자 쌍. 정상 연결로 주고받으며 전달 왕복을 잰다. */
export function victim(data) {
  const pairIndex = Math.ceil(__VU / 2);
  const role = __VU % 2 === 1 ? 'buyer' : 'seller';
  const room = String(9400 + pairIndex);
  const memberId = 9300 + pairIndex * 2 - (role === 'buyer' ? 1 : 0);
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);
  let seen = 0;

  ws.connect(NODE + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-v', '/user/queue/chat/' + room));
          // 부하가 몰리면 구독 등록 자체가 밀린다. 그 사이에 보내면 상대의 첫
          // 메시지들이 통째로 빠져(한 방향 100건 실종을 실측) 전달 지연과 다른
          // 축이 섞인다. 구독이 자리 잡을 시간을 넉넉히 둔다
          socket.setTimeout(function () {
            let i = 0;
            const sendOne = function () {
              socket.send(
                stomp.send('/app/chat/' + room + '/send', {
                  type: 'TEXT',
                  content: role + '-' + i + '|' + Date.now(),
                  clientMessageId: data.runId + '-v' + room + '-' + role + '-' + i,
                })
              );
              i++;
              if (i < PER_PERSON) {
                if (VICTIM_INTERVAL_MS > 0) {
                  socket.setTimeout(sendOne, VICTIM_INTERVAL_MS);
                } else {
                  sendOne();
                }
              }
            };
            sendOne();
          }, 8000);
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
        if (!payload.content) {
          return;
        }
        seen++;
        victimReceived.add(1);
        const sentAt = Number(String(payload.content).split('|')[1]);
        if (sentAt) {
          victimRt.add(Date.now() - sentAt);
        }
      });
    });
    socket.setTimeout(function () {
      const expected = PER_PERSON * 2;
      if (seen < expected) {
        victimMissing.add(expected - seen);
      }
      socket.close();
    }, OBSERVE_MS);
  });
}

/** 느린 수신자. 조인 프록시로 붙어 구독만 한다. 서버가 끊으면 그게 보호다. */
export function slowReceiver() {
  const pairIndex = SLOW_ROOM_OFFSET + __VU;
  const room = String(9400 + pairIndex);
  const memberId = 9300 + pairIndex * 2; // 판매자
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);
  let closedByServer = true;

  ws.connect(SLOW_BASE + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-s', '/user/queue/chat/' + room));
          return;
        }
        if (f.command === 'MESSAGE') {
          slowReceived.add(1);
        }
      });
    });
    socket.on('close', function () {
      if (closedByServer) {
        slowDisconnects.add(1);
      }
    });
    socket.setTimeout(function () {
      closedByServer = false;
      socket.close();
    }, OBSERVE_MS + 20000);
  });
}

/** 먹이 주기. 느린 수신자의 방에 정상 연결로 몰아 보낸다. */
export function feeder(data) {
  const pairIndex = SLOW_ROOM_OFFSET + __VU;
  const room = String(9400 + pairIndex);
  const memberId = 9300 + pairIndex * 2 - 1; // 구매자
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);
  // 세션 전송 버퍼(기본 512KB)를 채울 양. 400자 본문이면 응답 한 건이 1KB 안팎
  const pad = 'x'.repeat(400);

  ws.connect(NODE + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.setTimeout(function () {
            let i = 0;
            const sendNext = function () {
              socket.send(
                stomp.send('/app/chat/' + room + '/send', {
                  type: 'TEXT',
                  content: pad + '-' + i + '|' + Date.now(),
                  clientMessageId: data.runId + '-f' + room + '-' + i,
                })
              );
              fed.add(1);
              i++;
              if (i < FEED_COUNT) {
                socket.setTimeout(sendNext, 30);
              }
            };
            sendNext();
          }, 1000);
          return;
        }
      });
    });
    socket.setTimeout(function () {
      socket.close();
    }, OBSERVE_MS + 15000);
  });
}
