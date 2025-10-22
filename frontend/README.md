# 빌려joying Frontend

> 개인과 기업이 물건을 빌려주고 빌릴 수 있는 지역 기반 렌탈 마켓플레이스

## 🎯 프로젝트 개요

**빌려joying**은 당근마켓 스타일의 지역 커뮤니티 기반 렌탈 플랫폼입니다. Three.js 기반 인터랙티브 UI와 11단계 FSM 거래 프로세스로 안전하고 신뢰할 수 있는 대여 서비스를 제공합니다.

### 🌟 핵심 가치 제안

- **🎨 Three.js 인터랙티브 UI**: 떠다니는 3D 물건들과 마우스 인터랙션으로 몰입감 있는 UX
- **🛡️ 11단계 안전 거래**: FSM 기반 체계적인 거래 프로세스로 분쟁 최소화
- **💰 보증금 에스크로**: 플랫폼이 보증금을 안전하게 보관하여 위험 최소화
- **📹 개봉 영상 필수**: 수령/반납 시 영상 촬영으로 투명한 거래 보장
- **📍 지역 기반**: 법정동 단위 지역 설정으로 가까운 이웃과 거래

## 🚀 기술 스택

### Frontend 핵심
- **React 18** - UI 라이브러리 (Concurrent Features 활용)
- **Vite** - 빌드 도구 (빠른 HMR, 최적화된 번들링)
- **Tailwind CSS v4.0** - 유틸리티 기반 CSS 프레임워크
- **React Router v6** - 클라이언트 사이드 라우팅

### 3D & 애니메이션
- **Three.js** - WebGL 기반 3D 그래픽 렌더링
- **React Three Fiber (R3F)** - React 통합 Three.js 라이브러리
- **@react-three/drei** - Three.js 헬퍼 컴포넌트
- **GSAP** - 고성능 애니메이션 (ScrollTrigger 포함)
- **Lenis** - 부드러운 스크롤 인터폴레이션

### 상태 관리
- **Zustand** - 전역 상태 관리 (사용자 정보, 인증, 지역 설정)
- **React Query (@tanstack/react-query)** - 서버 상태 관리 및 캐싱
- **React Context API** - 컨텍스트 관리 (테마, 채팅 소켓)

### 폼 & 유효성 검사
- **React Hook Form** - 폼 상태 관리
- **Zod** - 스키마 기반 유효성 검사

### 기타 라이브러리
- **Axios** - HTTP 클라이언트
- **Socket.io-client** - WebSocket 실시간 통신
- **date-fns** - 날짜 처리 및 포맷팅
- **Sonner** - Toast 알림
- **React Dropzone** - 파일 업로드

## 📁 프로젝트 구조

```
src/
├── features/           # Feature-Based 아키텍처
│   ├── home/          # Three.js 메인 페이지
│   ├── auth/          # 인증 (카카오 로그인)
│   ├── user/          # 사용자 관리 (프로필, 계좌인증)
│   ├── product/       # 상품 CRUD 및 찜하기
│   ├── search/        # 검색 및 필터링
│   ├── chat/          # 실시간 채팅 및 거래 요청
│   ├── payment/       # 결제 및 에스크로
│   ├── shipping/      # 배송 추적
│   ├── video/         # 개봉 영상 녹화 (WebRTC)
│   ├── review/        # 리뷰 및 평점
│   └── mypage/        # 마이페이지 및 거래 내역
├── shared/            # 공통 리소스
│   ├── components/    # 재사용 컴포넌트
│   ├── hooks/         # 범용 훅
│   ├── utils/         # 유틸리티 함수 (FSM 로직 포함)
│   ├── constants/     # 상수 (FSM 상태, API 엔드포인트)
│   ├── contexts/      # 전역 Context
│   └── layouts/       # 레이아웃 컴포넌트
├── lib/               # 외부 라이브러리 설정
│   ├── axios/         # HTTP 클라이언트 설정
│   ├── react-query/   # Query 클라이언트 및 키
│   ├── router/        # 라우터 설정
│   └── zustand/       # 전역 상태 스토어
├── assets/            # 정적 리소스
│   ├── images/        # 이미지 파일
│   ├── icons/         # 아이콘 파일
│   ├── fonts/         # 폰트 파일
│   └── models/        # 3D 모델 파일 (.glb, .gltf)
└── styles/            # 전역 스타일
    ├── globalStyles.css
    ├── theme.js
    └── three.css       # Three.js 전용 스타일
```

### 🏗️ Feature-Based 아키텍처

각 도메인을 독립적인 feature 폴더로 구성하여 관심사를 분리했습니다.

#### Feature 구조 원칙
```
features/[feature-name]/
├── api/              # API 호출 함수
├── components/       # Feature 전용 컴포넌트
├── hooks/           # React Query 훅 + 커스텀 훅
├── pages/           # 라우팅 페이지
├── contexts/        # Feature 전용 Context (선택)
├── utils/           # Feature 전용 유틸리티 (선택)
└── index.js         # Barrel Export
```

#### 분리 기준
- **Feature**: 2개 미만 도메인에서 사용 → `features/[domain]/`
- **Shared**: 2개 이상 도메인에서 사용 → `shared/`
- **Lib**: 외부 라이브러리 초기화/설정 → `lib/`

## 🎯 핵심 기능

### 1. Three.js 인터랙티브 메인 페이지
- React Three Fiber 기반 3D 씬
- 떠다니는 물건들과 마우스 인터랙션
- GSAP ScrollTrigger로 스크롤 애니메이션
- 성능 최적화 (LOD, 인스턴싱, 메모이제이션)

### 2. 11단계 FSM 거래 시스템
```
PENDING_ACCEPTANCE → DEPOSIT_PENDING → RENTAL_FEE_PENDING → 
AWAITING_OUTBOUND_SHIPPING → OUTBOUND_SHIPPING_IN_PROGRESS → 
AWAITING_DELIVERY_CONFIRMATION → IN_USE → AWAITING_RETURN_SHIPPING → 
RETURN_SHIPPING_IN_PROGRESS → AWAITING_RETURN_CONFIRMATION → COMPLETED
```

### 3. 보증금 에스크로 시스템
- PG사 연동 (토스페이먼츠/아임포트)
- 플랫폼 보증금 보관
- 거래 완료 시 자동 환불
- 분쟁 시 중재 후 처리

### 4. 개봉 영상 필수 시스템
- WebRTC 기반 영상 녹화
- 수령 시/반납 시 필수 촬영
- 분쟁 발생 시 핵심 증거 자료

### 5. 신뢰도 뱃지 시스템
- 거래 횟수 기반: 🥉초보 → 🥈중급 → 🥇고급 → 💎전문가
- 평점 기반: ⭐우수 (4.5+) → ⭐⭐최우수 (4.8+)
- 특별 뱃지: 🎖️반납률 100%, ✅본인인증 완료

## 🛠️ 개발 환경 설정

### 필수 요구사항
- **Node.js** 18 이상
- **npm** 또는 **yarn**

### 설치 및 실행
```bash
# 저장소 클론
git clone <repository-url>
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값들을 설정하세요

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
```

### 환경 변수
```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_KAKAO_CLIENT_ID=your_kakao_client_id
VITE_WS_URL=ws://localhost:3000
VITE_ENV=development
```

## 📋 개발 규칙

### 브랜치 전략
- `main`: 프로덕션 배포용
- `develop`: 개발 통합 브랜치
- `feature/*`: 기능 개발 (예: feature/three-js-hero)
- `fix/*`: 버그 수정 (예: fix/chat-socket-error)

### 커밋 메시지 규칙
```bash
feat(home): add Three.js hero scene component
fix(chat): resolve WebSocket connection issue
refactor(fsm): improve state transition logic
docs(readme): update installation guide
```

### 코드 품질
```bash
# 린트 검사
npm run lint

# 린트 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format

# 포맷팅 검사
npm run format:check
```

## 🎨 UI/UX 가이드라인

### 색상 팔레트
- **Primary**: `#10b981` (Green-500) - 신뢰, 안전
- **Secondary**: `#3b82f6` (Blue-500) - 정보, 링크
- **Success**: `#22c55e` (Green-500) - 성공, 완료
- **Warning**: `#f59e0b` (Amber-500) - 경고
- **Error**: `#ef4444` (Red-500) - 에러

### 타이포그래피
- **폰트**: Pretendard (한글), Inter (영문)
- **크기**: text-xs (12px) ~ text-5xl (48px)
- **굵기**: font-light (300) ~ font-bold (700)

### 반응형 브레이크포인트
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🔐 보안 정책

### 인증 & 인가
- JWT 토큰 기반 인증
- Access Token (1시간) + Refresh Token (7일)
- 토큰 자동 갱신 (Axios Interceptor)

### 결제 보안
- **절대 프론트엔드에 결제 정보 저장 금지**
- PG사 SDK 사용 필수
- HTTPS 통신 필수

### XSS/CSRF 방어
- React 기본 XSS 방어 활용
- `dangerouslySetInnerHTML` 사용 금지
- CSRF 토큰 사용

## 📈 성능 최적화

### React 최적화
- `memo`, `useMemo`, `useCallback` 적절 사용
- React.lazy + Suspense 코드 스플리팅
- Key prop 올바른 사용

### Three.js 최적화
- React Three Fiber 사용
- LOD (Level of Detail) 구현
- 텍스처 압축 (KTX2, Basis)
- Intersection Observer 조건부 렌더링

### 네트워크 최적화
- React Query 캐싱
- Debounce/Throttle 검색
- 무한 스크롤 페이지네이션

## 🧪 테스팅

### 단위 테스트 (Vitest)
```bash
npm run test
```

### E2E 테스트 (Playwright)
```bash
npm run test:e2e
```

### 성능 테스트
```bash
npm run lighthouse
```

## 🚀 배포

### Vercel (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 환경별 설정
- **Development**: `.env.development`
- **Production**: `.env.production`

## 📚 개발 가이드

모든 개발 규칙과 가이드라인은 **`.cursorrules`** 파일에 통합되어 있습니다.

### 🤖 AI 중심 개발
- **Cursor AI**가 자동으로 읽고 적용하는 통합 규칙서
- 프로젝트별 맞춤 컨벤션 및 비즈니스 로직 포함
- 실시간 코드 생성 시 일관성 보장

### 📋 포함된 가이드
- **아키텍처**: Feature-based 구조 및 폴더 규칙
- **Three.js**: 성능 최적화 및 모바일 대응
- **FSM 시스템**: 11단계 거래 프로세스 명세
- **UI/UX**: 디자인 시스템 및 컴포넌트 패턴
- **보안**: 필수 보안 규칙 및 금지 사항
- **상태 관리**: Zustand/React Query/Context 전략

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 변경사항 커밋: `git commit -m 'feat: add amazing feature'`
4. 브랜치 푸시: `git push origin feature/amazing-feature`
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 👥 팀

- **Frontend**: React + Three.js 개발
- **Backend**: Node.js + Express + PostgreSQL
- **Design**: UI/UX 디자인 및 3D 모델링

---

**빌려joying** - 안전하고 신뢰할 수 있는 지역 기반 렌탈 플랫폼 🎯