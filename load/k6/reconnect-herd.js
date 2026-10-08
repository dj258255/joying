import ws from 'k6/ws';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 모두가 한꺼번에 다시 붙을 때 복구 조회가 전달을 미는지 잰다 (#95).
 *
 * 화면은 재연결 때마다 놓친 메시지를 HTTP(after=번호)로 당긴다. 한 명씩 끊길 때는
 * 문제가 없지만, 노드 사망이나 배포로 수십 명이 동시에 다시 붙으면 핸드셰이크와
 * 복구 조회가 한꺼번에 몰린다. 그 폭주가 그 시간에 계속 붙어 있던 사람들의 전달
 * 지연을 얼마나 미는지가 질문이다.
 *
 * 역할 둘을 나눈다.
 *   관찰 쌍 (OBSERVER_PAIRS 쌍)  계속 붙어서 일정 간격으로 주고받는다. 전달 왕복을
 *                               평시(steady)와 폭주(herd) 구간 태그로 나눠 기록한다
 *   폭주자  (HERD_SIZE 명)      자기 방에 메시지를 쌓은 뒤, 같은 시각에 일제히 끊고
 *                               다시 붙으며 복구 조회를 날린다
 *
 * 판정(H4, #95 에 사전 고정): 폭주 구간 p95 가 평시 p95 의 2배를 넘는가.
 *
 * 방과 회원은 seed-order-rooms.sh 가 만든 것을 쓴다. 필요한 쌍 수는
 * OBSERVER_PAIRS + HERD_SIZE 다 (폭주자는 쌍의 구매자만 쓴다).
 *
 * 실행 예 (쌍 10 관찰 + 40명 폭주):
 *   load/seed/seed-order-rooms.sh 50
 *   OBSERVER_PAIRS=10 HERD_SIZE=40 k6 run load/k6/reconnect-herd.js
 */

const NODE1 = __ENV.NODE1 || 'ws://localhost:8080';
const NODE2 = __ENV.NODE2 || 'ws://localhost:8081';
const API1 = __ENV.API1 || 'http://localhost:8080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const OBSERVER_PAIRS = Number(__ENV.OBSERVER_PAIRS || 10);
const HERD_SIZE = Number(__ENV.HERD_SIZE || 40);
const SEND_GAP_MS = Number(__ENV.SEND_GAP_MS || 200);
const PILE_COUNT = Number(__ENV.PILE_COUNT || 50);
const HERD_AT_MS = Number(__ENV.HERD_AT_MS || 20000);
const HERD_WINDOW_MS = Number(__ENV.HERD_WINDOW_MS || 10000);
const OBSERVE_MS = Number(__ENV.OBSERVE_MS || 45000);

const roundTrip = new Trend('delivery_round_trip', true);
const recoveryHttp = new Trend('recovery_http_duration', true);
const recovered = new Counter('recovered_messages');
const herdReconnects = new Counter('herd_reconnects');

export const options = {
  scenarios: {
    observers: {
      executor: 'per-vu-iterations',
      exec: 'observer',
      vus: OBSERVER_PAIRS * 2,
      iterations: 1,
      maxDuration: '180s',
    },
    herd: {
      executor: 'per-vu-iterations',
      exec: 'herder',
      vus: HERD_SIZE,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    // 0 이어도 표에 뜨게 한다. 폭주가 실제로 일어났다는 증거가 함께 남아야
    // "밀리지 않았다" 와 "폭주가 없었다" 를 구분할 수 있다
    herd_reconnects: ['count>=0'],
    recovered_messages: ['count>=0'],
    // 구간별 분포가 요약에 따로 나오게 한다. 판정은 이 둘의 p95 비교다
    'delivery_round_trip{phase:steady}': ['p(95)>=0'],
    'delivery_round_trip{phase:herd}': ['p(95)>=0'],
  },
};

export function setup() {
  // 모든 VU 가 같은 시계를 보도록 폭주 시각을 절대값으로 박는다
  return { runId: String(Date.now()), herdAt: Date.now() + HERD_AT_MS };
}

/** 관찰 쌍. 계속 붙어서 주고받고, 왕복을 구간 태그와 함께 기록한다. */
export function observer(data) {
  const pairIndex = Math.ceil(__VU / 2);
  const role = __VU % 2 === 1 ? 'buyer' : 'seller';
  const room = String(9400 + pairIndex);
  const memberId = 9300 + pairIndex * 2 - (role === 'buyer' ? 1 : 0);
  const base = role === 'buyer' ? NODE1 : NODE2;
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);

  ws.connect(base + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-' + role, '/user/queue/chat/' + room));
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
              socket.setTimeout(sendNext, SEND_GAP_MS);
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
        if (!payload.content) {
          return;
        }
        const sentAt = Number(String(payload.content).split('|')[1]);
        if (!sentAt) {
          return;
        }
        const now = Date.now();
        const phase =
          now >= data.herdAt && now < data.herdAt + HERD_WINDOW_MS ? 'herd' : 'steady';
        roundTrip.add(now - sentAt, { phase: phase });
      });
    });
    socket.setTimeout(function () {
      socket.close();
    }, OBSERVE_MS);
  });
}

/** 폭주자. 메시지를 쌓은 뒤 일제히 끊고 다시 붙으며 복구 조회를 날린다. */
export function herder(data) {
  const pairIndex = OBSERVER_PAIRS + __VU;
  const room = String(9400 + pairIndex);
  const memberId = 9300 + pairIndex * 2 - 1;
  const token = accessToken(memberId, 'load-' + memberId + '@joying.test', SECRET);
  let lastSeq = 0;

  // 1차 연결: 복구 조회가 당길 거리를 실제 경로로 쌓는다
  ws.connect(NODE1 + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-h', '/user/queue/chat/' + room));
          socket.setTimeout(function () {
            for (let i = 0; i < PILE_COUNT; i++) {
              socket.send(
                stomp.send('/app/chat/' + room + '/send', {
                  type: 'TEXT',
                  content: 'pile-' + i + '|' + Date.now(),
                  clientMessageId: data.runId + '-' + room + '-pile-' + i,
                })
              );
            }
          }, 2000);
          return;
        }
        if (f.command !== 'MESSAGE' || !f.body) {
          return;
        }
        try {
          const p = JSON.parse(f.body);
          if (p.sequence != null) {
            lastSeq = Math.max(lastSeq, p.sequence);
          }
        } catch (e) {
          /* 무시 */
        }
      });
    });
    // 폭주 시각에 끊는다
    socket.setTimeout(function () {
      socket.close();
    }, Math.max(1, data.herdAt - Date.now()));
  });

  // 재접속: 화면의 onConnect 가 하는 것처럼 핸드셰이크와 복구 조회를 함께 날린다.
  // 커서는 받은 것의 절반 지점으로 둬 복구가 실데이터를 당기게 한다
  herdReconnects.add(1);
  const cursor = Math.max(0, lastSeq - Math.floor(PILE_COUNT / 2));
  ws.connect(NODE1 + '/ws/chat/websocket?roomId=' + room, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });
    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command === 'CONNECTED') {
          socket.send(stomp.subscribe('sub-h2', '/user/queue/chat/' + room));
          const res = http.get(
            API1 + '/api/v1/chat-rooms/' + room + '/messages?after=' + cursor + '&size=100',
            { headers: { Cookie: 'access_token=' + token } }
          );
          recoveryHttp.add(res.timings.duration);
          if (res.status === 200) {
            try {
              const body = JSON.parse(res.body);
              const list = Array.isArray(body) ? body : body.content || body.data || [];
              recovered.add(list.length);
            } catch (e) {
              /* 무시 */
            }
          }
        }
      });
    });
    socket.setTimeout(function () {
      socket.close();
    }, HERD_WINDOW_MS);
  });
}
