import ws from 'k6/ws';
import { accessToken } from './lib/token.js';
import * as stomp from './lib/stomp.js';

/**
 * 같은 전송 식별자를 여러 번 보낸다 (#123 H15).
 *
 * <p>정본 교대 뒤에는 멱등의 심판이 새 DB 의 조건부 유니크다. 식별자 IDS 개를
 * 각각 RESENDS 번 보내고, 행이 IDS 개만 저장됐는지는 러너가 DB 로 센다.
 *
 * 실행: k6 run load/k6/resend-idempotent.js
 */

const BASE = __ENV.BASE || 'ws://localhost:8080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ROOM = __ENV.ROOM || '9001';
const IDS = Number(__ENV.IDS || 10);
const RESENDS = Number(__ENV.RESENDS || 3);

export const options = {
  scenarios: {
    sender: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '120s',
    },
  },
};

export function setup() {
  return { runId: String(Date.now()) };
}

export default function (data) {
  const token = accessToken(9001, 'load-a@joying.test', SECRET);
  const total = IDS * RESENDS;

  ws.connect(BASE + '/ws/chat/websocket', {}, function (socket) {
    socket.on('open', function () {
      socket.send(stomp.connect(token));
    });

    socket.on('message', function (raw) {
      stomp.parse(raw).forEach(function (f) {
        if (f.command !== 'CONNECTED') {
          return;
        }
        let n = 0;
        const chain = function () {
          // 같은 식별자를 돌려 가며 보낸다. n=0..IDS-1 이 첫 전송, 그 뒤는 재전송
          const id = n % IDS;
          socket.send(
            stomp.send('/app/chat/' + ROOM + '/send', {
              type: 'TEXT',
              content: 'resend-' + id + '|' + Date.now(),
              clientMessageId: data.runId + '-resend-' + id,
            })
          );
          n++;
          if (n < total) {
            socket.setTimeout(chain, 150);
          } else {
            socket.setTimeout(function () {
              socket.close();
            }, 3000);
          }
        };
        chain();
      });
    });
  });
}
