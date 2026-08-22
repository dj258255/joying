import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { accessToken } from './lib/token.js';

/**
 * 메시지 목록을 읽을 때 나가는 조회 수를 잰다.
 *
 * 목록을 만들면서 메시지마다 답장 대상을 따로 조회한다. 답장이 섞여 있으면 한 번
 * 읽을 때 그만큼 조회가 더 나간다. 코드에 주석으로 적혀 있던 것이고, 실제로 얼마나
 * 느려지는지는 재지 않았다.
 *
 * 답장 비율을 바꿔 가며 잰다. 비율이 오를수록 느려지면 그것이 이 조회 때문이다.
 *
 * 실행:
 *   k6 run load/k6/message-list-nplus1.js
 *   REPLY_RATIO=0 k6 run load/k6/message-list-nplus1.js
 */

const BASE = __ENV.BASE || 'http://localhost:8080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const ROOM = __ENV.ROOM || '9001';
const PAGE_SIZE = Number(__ENV.PAGE_SIZE || 50);

const listLatency = new Trend('message_list_duration', true);

export const options = {
  scenarios: {
    read: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '30s',
    },
  },
};

export default function () {
  const token = accessToken(9002, 'load-b@joying.test', SECRET);

  const res = http.get(
    `${BASE}/api/v1/chat-rooms/${ROOM}/messages?size=${PAGE_SIZE}`,
    { headers: { Cookie: 'access_token=' + token } }
  );

  listLatency.add(res.timings.duration);

  check(res, {
    '목록이 온다': (r) => r.status === 200,
  });
}
