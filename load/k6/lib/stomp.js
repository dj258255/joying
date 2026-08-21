/**
 * STOMP 프레임을 직접 만든다.
 *
 * k6에는 STOMP 클라이언트가 없고 SockJS도 없다. 다만 STOMP는 줄 단위 텍스트
 * 프로토콜이라 손으로 만들 수 있고, SockJS는 우회할 수 있다. Spring의
 * withSockJS() 는 SockJS 경로 외에 원시 웹소켓 경로도 함께 열어 둔다.
 * /ws/chat/websocket 으로 붙으면 SockJS 프레이밍 없이 STOMP 를 그대로 주고받는다.
 *
 * 프레임 구조: 명령\n헤더:값\n\n본문 뒤에 널 문자 하나.
 */

const NULL = '\u0000';

export function frame(command, headers, body) {
  let out = command + '\n';
  for (const key in headers) {
    out += key + ':' + headers[key] + '\n';
  }
  out += '\n' + (body || '') + NULL;
  return out;
}

export function connect(token) {
  // heart-beat 0,0 은 하트비트를 쓰지 않겠다는 뜻이다. 부하 실험에서 하트비트가
  // 늦어 끊기면 서버가 느린 것과 구분하기 어려워진다.
  //
  // 토큰은 cookie 헤더로 보낸다. 이 서버는 CONNECT 프레임의 cookie 헤더에서만
  // 토큰을 읽는다. 화면이 HttpOnly 쿠키를 쓰기 때문이고, 부하 스크립트도 같은
  // 자리로 보내야 실제와 같은 경로를 지난다.
  return frame('CONNECT', {
    'accept-version': '1.2',
    'heart-beat': '0,0',
    cookie: 'access_token=' + token,
  });
}

export function subscribe(id, destination) {
  return frame('SUBSCRIBE', { id: id, destination: destination });
}

export function send(destination, payload) {
  return frame(
    'SEND',
    { destination: destination, 'content-type': 'application/json' },
    JSON.stringify(payload)
  );
}

/**
 * 받은 덩어리에서 프레임을 하나씩 끊어 낸다.
 *
 * 웹소켓은 한 번에 여러 프레임이 붙어 올 수 있다. 널 문자로 끊는다.
 */
export function parse(raw) {
  return raw
    .split(NULL)
    .map((chunk) => chunk.replace(/^\n+/, ''))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const split = chunk.indexOf('\n\n');
      const head = split === -1 ? chunk : chunk.slice(0, split);
      const body = split === -1 ? '' : chunk.slice(split + 2);
      const lines = head.split('\n');
      const headers = {};
      for (let i = 1; i < lines.length; i++) {
        const colon = lines[i].indexOf(':');
        if (colon > 0) {
          headers[lines[i].slice(0, colon)] = lines[i].slice(colon + 1);
        }
      }
      return { command: lines[0], headers: headers, body: body };
    });
}
