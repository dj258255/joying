# Joying Frontend

물품 대여 플랫폼의 프론트엔드 애플리케이션입니다.

## 🚀 기술 스택

- **React 18** - UI 라이브러리
- **Vite** - 빌드 도구
- **React Query** - 서버 상태 관리
- **React Router v6** - 라우팅
- **Tailwind CSS** - 스타일링
- **Axios** - HTTP 클라이언트

## 📁 프로젝트 구조

```
src/
├── features/           # Feature-Based 아키텍처
│   ├── auth/          # 인증 관련 기능
│   ├── user/          # 사용자 관리
│   ├── chat/          # 채팅 기능
│   ├── product/       # 상품 관리
│   ├── payment/       # 결제 기능
│   ├── review/        # 리뷰 기능
│   ├── search/        # 검색 기능
│   └── mypage/        # 마이페이지
├── shared/            # 공통 리소스
│   ├── components/    # 재사용 컴포넌트
│   ├── hooks/         # 공통 훅
│   ├── utils/         # 유틸리티 함수
│   └── constants/     # 상수
├── lib/               # 라이브러리 설정
│   ├── axios/         # HTTP 클라이언트 설정
│   ├── react-query/   # React Query 설정
│   └── router/        # 라우터 설정
└── styles/            # 전역 스타일
```

## 🏗️ Feature-Based 아키텍처

각 도메인을 독립적인 feature 폴더로 구성하여 관심사를 분리했습니다.

### Feature 구조
```
features/[feature-name]/
├── api/              # API 호출 함수
├── components/       # Feature 전용 컴포넌트
├── hooks/           # React Query 훅
├── pages/           # 페이지 컴포넌트
├── contexts/        # Context (필요시)
└── index.js         # Barrel Export
```

### Shared 리소스
- **components/**: 2개 이상 feature에서 사용되는 재사용 컴포넌트
- **hooks/**: 도메인 무관한 범용 훅
- **utils/**: 순수 함수 유틸리티
- **constants/**: 전역 상수 관리

## 🛠️ 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp env.example .env
```

`.env` 파일에서 필요한 환경 변수를 설정하세요.

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 빌드
```bash
npm run build
```

## 📝 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기
- `npm run lint` - ESLint 검사
- `npm run lint:fix` - ESLint 자동 수정
- `npm run format` - Prettier 포맷팅
- `npm run format:check` - Prettier 검사

## 🎨 스타일링

Tailwind CSS를 사용하여 유틸리티 퍼스트 방식으로 스타일링합니다.

### 커스텀 클래스
- `.btn` - 기본 버튼 스타일
- `.btn-primary` - 주요 버튼
- `.btn-secondary` - 보조 버튼
- `.btn-danger` - 위험 버튼
- `.input` - 입력 필드
- `.card` - 카드 컨테이너

## 🔧 주요 기능

### 1. 인증 (Auth)
- 카카오 로그인
- 토큰 자동 갱신
- 사용자 정보 관리

### 2. 상품 관리 (Product)
- 상품 CRUD
- 찜하기 기능
- 대여 불가 날짜 설정

### 3. 채팅 (Chat)
- 실시간 메시지 송수신
- 웹소켓 연결
- 채팅방 관리

### 4. 결제 (Payment)
- 결제 생성/조회/취소/환불
- 결제 상태 확인

### 5. 리뷰 (Review)
- 상품 리뷰 작성/수정/삭제
- 사용자 리뷰 관리

### 6. 검색 (Search)
- 통합 검색
- 해시태그/카테고리 조회

### 7. 마이페이지 (MyPage)
- 대여 내역 조회
- 등록 상품 관리
- 찜한 상품 관리

## 🚀 배포

### 환경 변수
프로덕션 환경에서는 다음 환경 변수를 설정해야 합니다:

```env
VITE_API_BASE_URL=https://api.joying.com/api
VITE_WS_URL=wss://api.joying.com
VITE_NODE_ENV=production
```

### 빌드 최적화
- 코드 스플리팅 적용
- 청크 분할로 번들 크기 최적화
- Tree shaking으로 불필요한 코드 제거

## 📚 개발 가이드

### 컴포넌트 작성 규칙
1. PascalCase로 파일명 작성
2. Props 타입 주석 포함 (JSDoc)
3. 재사용 가능하도록 설계
4. Storybook 문서화 고려

### 훅 작성 규칙
1. camelCase + use 접두사
2. React Query와 분리된 API 함수 사용
3. 에러 처리 포함
4. 로딩 상태 관리

### API 호출 규칙
1. axios 인스턴스 사용
2. 에러 핸들링 포함
3. React Query와 연동
4. 타입 안전성 고려

## 🤝 기여하기

1. Feature 브랜치 생성
2. 변경사항 커밋
3. Pull Request 생성
4. 코드 리뷰 후 머지

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
