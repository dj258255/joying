# Home Feature

Three.js 기반 인터랙티브 메인 페이지를 담당하는 feature입니다.

## 📋 책임 범위

- Three.js 히어로 섹션 렌더링
- 3D 물건들과 마우스 인터랙션
- GSAP 스크롤 애니메이션
- 카테고리 선택 및 검색 연동
- 성능 최적화 (LOD, 인스턴싱, 메모이제이션)

## 🏗️ 구조

```
home/
├── components/
│   ├── HeroScene.jsx           # R3F Canvas 래퍼
│   ├── FloatingObjects.jsx     # 3D 물건들
│   ├── CameraController.jsx    # 카메라 인터랙션
│   └── LoadingOverlay.jsx      # Three.js 로딩 스피너
├── hooks/
│   ├── useThreeScene.js        # Three.js 씬 초기화
│   ├── useScrollSync.js        # Lenis 스크롤 동기화 (예정)
│   └── useObjectInteraction.js # Raycaster 인터랙션 (예정)
├── utils/
│   ├── sceneSetup.js           # 라이트, 카메라 설정 (예정)
│   ├── animations.js           # GSAP 애니메이션 로직 (예정)
│   └── modelLoader.js          # 3D 모델 로딩 유틸 (예정)
├── pages/
│   └── HomePage.jsx            # 메인 페이지
└── index.js                    # Barrel Export
```

## 🔧 주요 기능

### HeroScene 컴포넌트
- React Three Fiber Canvas 래퍼
- Suspense로 로딩 처리
- 환경 설정 및 조명
- 성능 최적화 설정

### FloatingObjects 컴포넌트
- 떠다니는 3D 물건들 렌더링
- 마우스 인터랙션 (호버, 클릭)
- 카테고리별 물건 그룹화
- LOD 및 인스턴싱 적용

### CameraController 컴포넌트
- 마우스 움직임에 따른 카메라 이동
- Parallax 효과
- 부드러운 전환 애니메이션
- 모바일 자동 회전 모드

## 🎯 성능 최적화 전략

### 1. 코드 스플리팅
- React.lazy로 Three.js 관련 라이브러리 분리
- 다른 페이지에서는 Three.js 로드하지 않음

### 2. 메모이제이션
- React.memo로 불필요한 리렌더링 방지
- useMemo로 3D 모델 로딩 결과 캐싱

### 3. LOD (Level of Detail)
- 카메라 거리에 따라 모델 복잡도 조절
- 가까이: 고해상도, 멀리: 저해상도

### 4. Intersection Observer
- 화면에서 벗어나면 렌더링 중지
- 스크롤 다운 후 GPU 사용량 0%

### 5. 모바일 최적화
- devicePixelRatio 제한 (최대 2)
- 폴리곤 수 50% 감소
- 자동 회전 애니메이션으로 인터랙션 대체

## 📝 사용 예시

```jsx
import { HomePage, HeroScene } from '@/features/home';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

// 개별 컴포넌트 사용
function CustomPage() {
  const handleCategoryClick = (category) => {
    // 카테고리 검색 페이지로 이동
  };

  return (
    <div>
      <HeroScene onCategoryClick={handleCategoryClick} />
    </div>
  );
}
```

## 🚀 개발 예정 사항

### Phase 1: 기본 Three.js 씬
- [ ] React Three Fiber 설치 및 설정
- [ ] 기본 3D 객체 배치 (Box, Sphere)
- [ ] 카메라 및 조명 설정
- [ ] 기본 마우스 인터랙션

### Phase 2: 3D 모델 및 애니메이션
- [ ] 실제 3D 모델 로딩 (.glb, .gltf)
- [ ] GSAP ScrollTrigger 연동
- [ ] Lenis 부드러운 스크롤
- [ ] 물건별 호버 효과

### Phase 3: 성능 최적화
- [ ] LOD 구현
- [ ] 인스턴싱 적용
- [ ] 텍스처 압축 (KTX2, Basis)
- [ ] Web Worker 활용

### Phase 4: 고급 기능
- [ ] 물리 시뮬레이션
- [ ] 파티클 효과
- [ ] 포스트 프로세싱
- [ ] AR 미리보기 (장기)

## 📚 참고 자료

- [React Three Fiber 공식 문서](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Journey](https://threejs-journey.com/)
- [GSAP ScrollTrigger](https://greensock.com/scrolltrigger/)
- [Lenis Smooth Scroll](https://github.com/studio-freight/lenis)
