import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

/**
 * 서버와 같은 비밀키로 접근 토큰을 만든다.
 *
 * 이 프로젝트의 로그인은 카카오 OAuth2 하나뿐이라 부하 스크립트가 로그인을 흉내 낼
 * 수 없다. 서버가 쓰는 것과 같은 방식(HS256, sub 에 회원 번호)으로 직접 서명해
 * 붙인다. 검증 로직은 그대로 지나므로 실제 요청과 다르지 않다.
 */
function base64url(input) {
  return encoding
    .b64encode(input, 'std')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function accessToken(memberId, email, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: String(memberId),
      email: email,
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = header + '.' + payload;
  const signature = crypto
    .hmac('sha256', secret, signingInput, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return signingInput + '.' + signature;
}
