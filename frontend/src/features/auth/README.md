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
