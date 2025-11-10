# 🚀 안전한 메인페이지 최적화 가이드

## ✅ 이미 적용된 최적화 (동작 유지)

### 1. **React.memo로 불필요한 리렌더링 방지**
- `Model3D` 컴포넌트: 3D 모델 리렌더링 방지
- `StarlightParticles` 컴포넌트: 파티클 효과 최적화
- `FallingLeaves` 컴포넌트: 나뭇잎 애니메이션 최적화

---

## 🎯 추가 최적화 방안 (동작 유지)

### 1. **3D 모델 파일 압축** ⭐ 가장 효과적
현재 모델 파일들이 크기 때문에 로딩이 느립니다.

```bash
# gltf-pipeline 설치
npm install -g gltf-pipeline

# 각 모델 압축 (Draco 압축 적용)
cd public/models
gltf-pipeline -i camera.glb -o camera-compressed.glb -d
gltf-pipeline -i tent.glb -o tent-compressed.glb -d
gltf-pipeline -i gamepad.glb -o gamepad-compressed.glb -d

# 압축된 파일로 교체
mv camera-compressed.glb camera.glb
mv tent-compressed.glb tent.glb
mv gamepad-compressed.glb gamepad.glb
```

**예상 효과**: 파일 크기 50-70% 감소, 로딩 시간 2-3초 단축

---

### 2. **이미지 최적화**

```bash
# 이미지 압축 도구 설치
npm install imagemin imagemin-webp -D

# WebP로 변환 (손실 없는 압축)
npx imagemin src/assets/**/*.{jpg,png} --out-dir=src/assets/optimized --plugin=webp
```

---

### 3. **불필요한 import 제거**

#### HomePage.jsx에서:
```javascript
// ❌ 사용하지 않는 import 제거
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// ✅ 필요한 것만 import
import { Color, Vector3, AdditiveBlending } from 'three';
```

---

### 4. **React Query 설정 최적화**

```javascript
// lib/react-query/queryClient.js
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false, // ✨ 불필요한 refetch 방지
    }
  }
});
```

---

### 5. **vite.config.js 최적화**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // ✨ 청크 분할 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'animation': ['gsap', 'lottie-react']
        }
      }
    },
    // ✨ 청크 크기 제한
    chunkSizeWarningLimit: 1000,
  },
  // ✨ 개발 서버 최적화
  server: {
    hmr: {
      overlay: false // HMR 오버레이 비활성화
    }
  }
});
```

---

### 6. **환경변수 활용**

```bash
# .env.production
VITE_API_BASE_URL=https://api.yourapp.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PARTICLES=true # 저사양 기기에서는 false

# .env.development  
VITE_API_BASE_URL=http://localhost:3000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PARTICLES=true
```

```javascript
// HomePage.jsx에서 사용
const enableParticles = import.meta.env.VITE_ENABLE_PARTICLES === 'true';

// 조건부 렌더링 (파티클 비활성화 가능)
{enableParticles && <StarlightParticles currentSection={currentSectionIndex} />}
{enableParticles && <FallingLeaves currentSection={currentSectionIndex} />}
```

---

### 7. **Service Worker 캐싱 (PWA)**

```bash
npm install vite-plugin-pwa -D
```

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,glb}'],
        runtimeCaching: [
          {
            // 3D 모델 파일 캐싱
            urlPattern: /^.*\.(glb)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'models-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30일
              }
            }
          },
          {
            // API 응답 캐싱
            urlPattern: /^https:\/\/api\.yourapp\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24시간
              }
            }
          }
        ]
      }
    })
  ]
});
```

---

### 8. **index.html 최적화**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/vite.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- ✨ DNS Prefetch -->
  <link rel="dns-prefetch" href="https://api.yourapp.com">
  <link rel="dns-prefetch" href="https://www.gstatic.com">
  
  <!-- ✨ Preconnect -->
  <link rel="preconnect" href="https://api.yourapp.com">
  <link rel="preconnect" href="https://www.gstatic.com">
  
  <!-- ✨ 폰트 최적화 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <title>빌려joying</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

---

### 9. **번들 분석**

```bash
# 번들 분석 도구 설치
npm install --save-dev rollup-plugin-visualizer

# package.json에 스크립트 추가
{
  "scripts": {
    "analyze": "vite-bundle-visualizer"
  }
}

# 실행
npm run analyze
```

---

### 10. **Lighthouse 점수 확인**

```bash
# Chrome DevTools → Lighthouse
# Performance 점수 확인
# 목표: 90점 이상
```

---

## 📊 예상 성능 개선

| 항목 | Before | After | 방법 |
|------|--------|-------|------|
| 3D 모델 크기 | 5-10MB | 1-3MB | Draco 압축 |
| 이미지 크기 | 2-3MB | 500KB-1MB | WebP 변환 |
| JS 번들 크기 | 2MB | 1.5MB | Tree shaking, Code splitting |
| 초기 로딩 시간 | 4-5초 | 2-3초 | 위 모든 최적화 |
| FCP | 2.5초 | 1.5초 | Service Worker |
| LCP | 4.5초 | 2.5초 | 이미지 최적화 |

---

## 🎯 우선순위

### 🔥 즉시 적용 (이미 완료)
- [x] React.memo로 컴포넌트 최적화

### ⚡ 높은 우선순위 (다음 적용 권장)
1. **3D 모델 압축** (가장 효과적, 2-3초 단축)
2. **이미지 WebP 변환** (1초 단축)
3. **vite.config.js 최적화** (번들 크기 20% 감소)

### 🎨 중간 우선순위
1. Service Worker & PWA
2. React Query 설정 최적화
3. 환경변수 활용

### 📈 낮은 우선순위
1. CDN 적용
2. Edge Computing
3. HTTP/3 프로토콜

---

## ⚠️ 절대 하지 말아야 할 것

### ❌ 섹션 Lazy Loading
```javascript
// ❌ 이렇게 하면 안 됨 - 스크롤이 작동하지 않음
{currentSectionIndex >= 1 && <Section2Camera />}
```

**이유**: `goToSection` 함수가 `document.getElementById()`로 섹션을 찾는데, DOM에 없으면 스크롤이 실패

### ❌ 3D 모델 Preload 제거
```javascript
// ❌ 이렇게 하면 안 됨 - 첫 화면이 비어보임
// useGLTF.preload() 제거
```

**이유**: 섹션 전환 시 즉시 모델이 보여야 부드러운 애니메이션 가능

### ❌ API 조건부 호출
```javascript
// ❌ 이렇게 하면 안 됨 - 섹션이 비어있음
const { data } = useProducts({ enabled: currentSection >= 2 });
```

**이유**: 섹션에 도달하기 전에 데이터가 로드되어 있어야 빈 화면 방지

---

## 🔍 모니터링

```javascript
// Performance 측정 코드 추가
if (import.meta.env.DEV) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`⏱️ ${entry.name}: ${entry.duration}ms`);
    });
  });
  
  observer.observe({ entryTypes: ['measure', 'navigation'] });
}
```

---

**핵심**: 동작을 해치지 않으면서 **파일 크기를 줄이고**, **캐싱을 개선**하는 것이 가장 안전하고 효과적입니다! 🚀

