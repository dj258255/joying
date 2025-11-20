# Auth Feature

인증 관련 기능을 담당하는 feature입니다.

## 📋 책임 범위

- 카카오 로그인/로그아웃
- 토큰 갱신
- 사용자 정보 조회
- 인증 상태 관리

## 🏗️ 구조

```
auth/
├── api/
│   └── authApi.js          # 인증 API 함수
├── components/
│   ├── KakaoLoginButton.jsx # 카카오 로그인 버튼
│   └── AuthTokenHandler.jsx # 토큰 자동 갱신
├── hooks/
│   ├── useAuth.js          # 인증 상태 관리 훅
│   └── useKakaoLogin.js    # 카카오 로그인 훅
├── pages/
│   └── LoginPage.jsx        # 로그인 페이지
└── index.js                # Barrel Export
```

## 🔧 주요 기능

### useAuth 훅
- 현재 사용자 정보 조회
- 로그인/로그아웃 상태 관리
- 토큰 갱신 기능

### useKakaoLogin 훅
- 카카오 SDK 연동
- 인증 코드 획득
- 로그인 처리

## 📝 사용 예시

```jsx
import { useAuth, KakaoLoginButton } from '@/features/auth';

function LoginComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>안녕하세요, {user.nickname}님!</p>
          <button onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <KakaoLoginButton />
      )}
    </div>
  );
}
```

## 🔗 API 엔드포인트

- `POST /auth/kakao` - 카카오 로그인
- `POST /auth/logout` - 로그아웃
- `POST /auth/refresh` - 토큰 갱신
- `GET /auth/me` - 현재 사용자 정보
- `GET /auth/validate` - 토큰 유효성 검증

## 🔐 보안 정책

### JWT 토큰 관리
- **Access Token**: 1시간 만료, 메모리에만 저장
- **Refresh Token**: 7일 만료, 로컬 스토리지에 저장
- 토큰 만료 5분 전 자동 갱신
- 갱신 실패 시 자동 로그아웃

### 카카오 로그인 플로우
1. 카카오 인증 서버로 리다이렉트
2. 사용자 동의 후 인증 코드 획득
3. 백엔드에서 인증 코드로 토큰 교환
4. JWT 토큰 발급 및 사용자 정보 저장

## 🚀 개발 예정 사항

### Phase 1: 기본 인증
- [x] 카카오 로그인
- [x] JWT 토큰 관리
- [x] 자동 토큰 갱신
- [ ] 로그인 상태 지속성 개선

### Phase 2: 추가 인증 방식
- [ ] 네이버 로그인
- [ ] 구글 로그인
- [ ] 애플 로그인
- [ ] 휴대폰 본인인증

### Phase 3: 보안 강화
- [ ] 2단계 인증 (2FA)
- [ ] 생체 인증 (지문, 얼굴)
- [ ] 디바이스 등록 관리
- [ ] 의심스러운 로그인 감지

## 📱 소셜 로그인 설정

### 카카오 개발자 설정
```javascript
// 카카오 SDK 초기화
window.Kakao.init(import.meta.env.VITE_KAKAO_CLIENT_ID);

// 리다이렉트 URI 설정
const REDIRECT_URI = `${window.location.origin}/auth/callback`;
```

### 환경 변수
```bash
VITE_KAKAO_CLIENT_ID=your_kakao_client_id
VITE_KAKAO_REDIRECT_URI=http://localhost:5173/auth/callback
```

이 feature를 통해 안전하고 편리한 인증 시스템을 제공합니다.