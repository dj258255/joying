/**
 * 받는 쪽에서 번호 순으로만 내보내는 보류 버퍼.
 *
 * 도착 순서가 뒤집혀도 다음 번호가 올 때까지 쥐고 있다가 순서대로 방출한다.
 * 그래서 방출 순서의 뒤집힘은 구성으로 0이 되고, 대가는 전부 대기로 바뀐다.
 * 이 대기(buffer wait)가 클라이언트 복원 방식의 값이다.
 *
 * 결번은 기다려도 오지 않을 수 있다. 이 서버는 번호를 받은 뒤 저장이 실패하면
 * 그 번호를 비워 두는 설계라, 빈 자리와 늦는 메시지가 같은 모양이다. 그래서
 * holdMs 만큼 기다린 뒤 건너뛰며(give up), 건너뛴 자리 수를 센다. 포기한 자리로
 * 메시지가 늦게 도착하면 그때는 역전으로 방출되고 그것도 센다. 포기와 늦은 도착이
 * 0 이 아니면 그 실행의 "방출 뒤집힘 0" 은 보장이 아니다.
 */
export function createHoldback(holdMs, onRelease) {
  let expected = null; // 다음에 내보낼 번호. 첫 도착으로 정한다
  const buffer = new Map(); // seq -> { payload, arrivedAt }
  let gapSince = null; // expected 가 막히기 시작한 시각

  const stats = {
    released: 0,
    releaseInversions: 0, // 포기한 자리로 늦게 도착해 역전 방출된 건수
    gapGiveUps: 0, // holdMs 를 기다리고 건너뛴 번호 자리 수
    maxBuffered: 0,
  };

  function release(payload, waitedMs, inverted) {
    stats.released++;
    if (inverted) {
      stats.releaseInversions++;
    }
    onRelease(payload, waitedMs, inverted);
  }

  function drain(now) {
    while (buffer.has(expected)) {
      const entry = buffer.get(expected);
      buffer.delete(expected);
      release(entry.payload, now - entry.arrivedAt, false);
      expected++;
    }
    gapSince = buffer.size > 0 ? (gapSince === null ? now : gapSince) : null;
  }

  return {
    /** 메시지 도착. seq 는 서버가 붙인 방 단위 번호다. */
    accept(seq, payload, now) {
      if (expected === null) {
        // 첫 도착을 기준으로 삼는다. 그보다 앞 번호가 나중에 오면 역전으로 센다
        expected = seq;
      }
      if (seq < expected) {
        // 이미 내보냈거나 포기한 자리다. 쥐고 있어도 제자리가 없으므로 바로
        // 내보내되 역전으로 센다
        release(payload, 0, true);
        return;
      }
      if (seq === expected) {
        release(payload, 0, false);
        expected++;
        drain(now);
        return;
      }
      buffer.set(seq, { payload: payload, arrivedAt: now });
      if (stats.maxBuffered < buffer.size) {
        stats.maxBuffered = buffer.size;
      }
      if (gapSince === null) {
        gapSince = now;
      }
    },

    /** 주기적으로 불러 결번 대기가 상한을 넘었으면 건너뛴다. */
    tick(now) {
      if (gapSince === null || buffer.size === 0 || now - gapSince < holdMs) {
        return;
      }
      let next = null;
      buffer.forEach(function (v, k) {
        if (next === null || k < next) {
          next = k;
        }
      });
      stats.gapGiveUps += next - expected;
      expected = next;
      gapSince = null;
      drain(now);
    },

    /** 관찰 종료. 남은 것을 번호 순으로 모두 내보낸다. 건너뛴 자리도 센다. */
    flush(now) {
      const keys = [];
      buffer.forEach(function (v, k) {
        keys.push(k);
      });
      keys.sort(function (a, b) {
        return a - b;
      });
      keys.forEach(function (k) {
        if (expected !== null && k > expected) {
          stats.gapGiveUps += k - expected;
        }
        const entry = buffer.get(k);
        buffer.delete(k);
        release(entry.payload, now - entry.arrivedAt, false);
        expected = k + 1;
      });
      gapSince = null;
    },

    stats: stats,
  };
}
