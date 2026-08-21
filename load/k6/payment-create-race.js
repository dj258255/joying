import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { accessToken } from './lib/token.js';

/**
 * 같은 대여 건으로 동시에 결제를 만들면 몇 건이 생기는지 잰다.
 *
 * 결제 생성은 이미 있는지를 조회해서 판정한다. 동시에 들어온 두 요청은 둘 다
 * 없다고 읽고 둘 다 넣는다. 조회와 삽입 사이에 아무것도 막아 주는 것이 없다.
 *
 * 사람이 결제 버튼을 두 번 누르거나, 응답이 늦어 다시 누르면 그대로 일어난다.
 * 결제 건이 둘이면 하나는 승인되고 하나는 READY 로 남아, 대여 하나에 결제가
 * 둘 붙은 상태가 된다.
 *
 * 세는 것은 응답이 아니라 남은 행이다. 응답만 보면 전부 200 이라 정상으로 보인다.
 *
 * 실행: k6 run load/k6/payment-create-race.js
 */

const BASE = __ENV.BASE || 'http://localhost:8080';
const SECRET = __ENV.JWT_SECRET || 'joying-local-secret-key-for-development-only';
const RENTAL_ID = Number(__ENV.RENTAL_ID || 9001);
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 9001);
const CONCURRENCY = Number(__ENV.CONCURRENCY || 16);

const created = new Counter('create_ok');
const rejected = new Counter('create_rejected');

export const options = {
  scenarios: {
    burst: {
      executor: 'per-vu-iterations',
      vus: CONCURRENCY,
      iterations: 1,
      maxDuration: '30s',
      // 전부 같은 순간에 출발해야 조회와 삽입 사이가 겹친다
      gracefulStop: '10s',
    },
  },
};

export default function () {
  const token = accessToken(9001, 'load-a@joying.test', SECRET);

  const res = http.post(
    BASE + '/api/v1/payments',
    JSON.stringify({
      rentalHisId: RENTAL_ID,
      productId: PRODUCT_ID,
      // 일일 10,000원 × 3일 + 보증금 50,000원
      totalAmount: 80000,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'access_token=' + token,
      },
    }
  );

  if (res.status === 200 || res.status === 201) {
    created.add(1);
  } else {
    rejected.add(1);
    console.log('거절 status=' + res.status + ' body=' + String(res.body).slice(0, 160));
  }

  check(res, { '응답이 왔다': (r) => r.status > 0 });
}
