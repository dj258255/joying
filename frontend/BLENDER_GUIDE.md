# 🎨 Blender → Three.js 워크플로우 가이드

## 📋 목차
1. [필요한 파일 포맷](#필요한-파일-포맷)
2. [Blender 내보내기 가이드](#blender-내보내기-가이드)
3. [Three.js 사용법](#threejs-사용법)
4. [최적화 팁](#최적화-팁)
5. [문제 해결](#문제-해결)

---

## 🎯 필요한 파일 포맷

### ✅ glTF/GLB (권장)

**가장 권장하는 포맷**: **`.glb`** (glTF Binary)

| 포맷 | 특징 | 용도 |
|------|------|------|
| **`.glb`** | 단일 바이너리 파일, 텍스처 포함 | ✅ **프로덕션 환경** |
| `.gltf` | JSON + 별도 텍스처 파일 | 개발/디버깅용 |
| `.fbx` | 지원하지만 권장하지 않음 | 레거시 |
| `.obj` | 매우 기본적, 재질 정보 없음 | 간단한 테스트용 |

---

## 🎨 Blender 내보내기 가이드

### 1️⃣ Blender에서 Export 메뉴 열기

```
File → Export → glTF 2.0 (.glb/.gltf)
```

### 2️⃣ Export 설정 (완벽 가이드)

#### ⚙️ Format 탭
```
✅ Format: glTF Binary (.glb)
   - 단일 파일로 모든 것 포함
   - 로딩 속도 빠름
   - 파일 크기 작음

✅ Remember Export Settings
   - 설정을 저장하여 다음에도 사용
```

#### 📦 Include 탭
```
✅ Selected Objects
   - 선택한 오브젝트만 내보내기
   
✅ Visible Objects
   - 보이는 오브젝트만 포함
   
❌ Cameras (체크 해제)
   - Three.js에서 자체 카메라 사용
   
❌ Punctual Lights (체크 해제)
   - Three.js에서 자체 조명 사용
   
✅ Custom Properties
   - 커스텀 속성 포함
```

#### 🔄 Transform 탭
```
✅ +Y Up (필수!)
   - Blender: Z-up
   - Three.js: Y-up
   - 이 옵션으로 자동 변환
   
Scale: 1.0
   - 기본 스케일 유지
```

#### 🎭 Geometry 탭
```
✅ Apply Modifiers (필수!)
   - 모든 모디파이어 적용
   - Subdivision, Mirror 등
   
✅ UVs
   - 텍스처 매핑 정보
   
✅ Normals
   - 법선 벡터 (조명 계산)
   
✅ Tangents
   - 노말맵에 필요
   
✅ Vertex Colors (필요시)
   - 버텍스 컬러 사용 시
   
✅ Materials: Export
   - PBR 재질 정보 포함
```

#### 🎬 Animation 탭
```
✅ Animation (애니메이션 있을 때만)
   - 애니메이션 포함
   
✅ Limit to Playback Range
   - 타임라인 범위만
   
Sampling Rate: 1
   - 키프레임 샘플링 간격
```

#### 📦 Compression (파일 크기 최적화)
```
✅ Draco (권장)
   - 파일 크기 50~70% 감소
   - 로딩 시간 약간 증가 (미미함)
   
설정:
- Quantize Position: 14 bits (위치 정밀도)
- Quantize Normal: 10 bits (법선 정밀도)
- Quantize Texcoord: 12 bits (UV 정밀도)
- Quantize Color: 10 bits (색상 정밀도)
- Quantize Generic: 12 bits
```

### 3️⃣ Export 실행

```
1. 파일명 입력: camera.glb
2. 저장 위치: /public/models/
3. Export glTF 2.0 버튼 클릭
```

---

## 🚀 Three.js 사용법

### 기본 사용법

```jsx
import { useGLTF } from '@react-three/drei';

function Camera() {
  const { scene } = useGLTF('/models/camera.glb');
  
  return (
    <primitive 
      object={scene} 
      position={[0, 0, 0]}
      scale={1}
      rotation={[0, 0, 0]}
    />
  );
}

// 프리로드 (권장)
useGLTF.preload('/models/camera.glb');
```

### 애니메이션 사용법

```jsx
import { useGLTF, useAnimations } from '@react-three/drei';
import { useEffect, useRef } from 'react';

function AnimatedModel() {
  const group = useRef();
  const { scene, animations } = useGLTF('/models/robot.glb');
  const { actions } = useAnimations(animations, group);
  
  useEffect(() => {
    // 'Walk' 애니메이션 재생
    actions['Walk']?.play();
  }, [actions]);
  
  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
```

### 프로젝트에서 사용 중인 패턴

```jsx
// src/features/home/components/FloatingObjects.jsx

const FloatingObject = ({ modelPath, position, category, scale }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(modelPath);
  
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <primitive
        ref={meshRef}
        object={scene.clone()} // 중요: clone() 사용
        position={position}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </Float>
  );
};
```

---

## ⚡ 최적화 팁

### 1. 폴리곤 수 줄이기

```
Blender에서:
1. 모델 선택
2. Modifiers → Add Modifier → Decimate
3. Ratio: 0.5 (50% 감소)
4. Apply Modifier
```

**권장 폴리곤 수:**
- 작은 오브젝트 (카메라, 콘솔): 500 ~ 5,000
- 중간 오브젝트 (드론, 텐트): 5,000 ~ 20,000  
- 큰 오브젝트 (자전거, 차): 20,000 ~ 50,000

### 2. 텍스처 최적화

```
권장 설정:
- 해상도: 1024x1024 (작은 것) ~ 2048x2048 (큰 것)
- 포맷: JPEG (디퓨즈) + PNG (알파채널)
- 압축: 80~90% 품질
```

**Blender에서 텍스처 베이크:**
```
1. Render Properties → Bake
2. Bake Type: Combined
3. Influence: 모두 체크
4. Output: 1024x1024
5. Bake 클릭
6. Image → Save As → PNG
```

### 3. Material 설정 (PBR)

```
Blender Shader Editor:

Principled BSDF 사용 (PBR 표준)
├─ Base Color: 기본 색상 (RGB)
├─ Metallic: 0.0 ~ 1.0 (금속성)
├─ Roughness: 0.0 ~ 1.0 (거칠기)
├─ Normal: Normal Map (선택)
└─ Emission: 발광 효과 (선택)
```

### 4. 크기 가이드

**Blender Units:**
```
1 BU = 1 Meter (현실 세계)

권장 크기:
- 카메라: 0.15 ~ 0.25 BU
- 드론: 0.3 ~ 0.5 BU
- 텐트: 1.0 ~ 2.0 BU
- 콘솔: 0.2 ~ 0.4 BU
- 자전거: 1.5 ~ 2.0 BU
```

**Three.js에서 스케일 조정:**
```jsx
<primitive 
  object={scene} 
  scale={0.5} // 50% 크기
/>
```

---

## 🐛 문제 해결

### ❌ 모델이 안 보여요

**원인 1: Scale 문제**
```
Blender에서:
1. 모델 선택
2. Ctrl + A → Apply → All Transforms
3. 다시 Export
```

**원인 2: 카메라 위치**
```jsx
// Three.js 카메라 위치 확인
<PerspectiveCamera position={[0, 0, 5]} />
```

**원인 3: 조명 부족**
```jsx
// 조명 추가
<ambientLight intensity={0.5} />
<directionalLight position={[5, 5, 5]} intensity={1} />
```

### ❌ 색상이 이상해요

**원인: Material 설정 문제**
```
Blender에서:
1. Shading 탭 이동
2. Material Properties 확인
3. Principled BSDF 사용 확인
4. Base Color 연결 확인
```

### ❌ 모델이 뒤집혔어요

**원인: +Y Up 설정 안 함**
```
Export 시:
Transform → +Y Up 체크 필수!
```

또는 Three.js에서:
```jsx
<primitive 
  object={scene} 
  rotation={[Math.PI / 2, 0, 0]} // 90도 회전
/>
```

### ❌ 파일이 너무 커요 (>5MB)

**해결책:**
```
1. Draco Compression 사용
2. 텍스처 해상도 낮추기 (2048 → 1024)
3. 폴리곤 수 줄이기 (Decimate Modifier)
4. 불필요한 오브젝트 삭제
5. 애니메이션 프레임 줄이기
```

### ❌ 텍스처가 안 보여요

**원인 1: UV 매핑 문제**
```
Blender에서:
1. UV Editing 탭
2. 모델 선택 → U → Smart UV Project
```

**원인 2: 텍스처 경로 문제**
```
Export 전에:
1. Image 저장 확인
2. Relative Path 사용
3. Pack Resources (File → External Data → Pack Resources)
```

---

## 📚 참고 자료

### 공식 문서
- [glTF 공식 사이트](https://www.khronos.org/gltf/)
- [Blender glTF Exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [@react-three/drei](https://github.com/pmndrs/drei)

### 무료 3D 모델
- [Sketchfab](https://sketchfab.com/feed) - glTF 다운로드
- [Poly Haven](https://polyhaven.com/models) - CC0
- [Kenney Assets](https://kenney.nl/assets) - CC0
- [Quaternius](https://quaternius.com/) - CC0

### 학습 자료
- [Blender Guru 유튜브](https://www.youtube.com/user/AndrewPPrice)
- [Three.js Journey](https://threejs-journey.com/)
- [React Three Fiber 문서](https://docs.pmnd.rs/react-three-fiber)

---

## ✅ 체크리스트

Export 전 확인사항:

- [ ] 모든 Transform 적용 (Ctrl + A)
- [ ] UV 매핑 완료
- [ ] Material 설정 완료 (Principled BSDF)
- [ ] 텍스처 저장 및 Pack
- [ ] 불필요한 오브젝트 삭제
- [ ] Scale 확인 (적절한 크기)
- [ ] Normals 방향 확인
- [ ] Export 설정: +Y Up, Apply Modifiers, Draco
- [ ] 파일명 확인 (소문자, 언더스코어)
- [ ] 저장 위치: `public/models/`

---

## 🎯 프로젝트에서 필요한 모델

```
public/models/
├── camera.glb       # 📷 카메라 (DSLR, 미러리스)
├── drone.glb        # 🚁 드론 (쿼드콥터)
├── tent.glb         # ⛺ 텐트 (캠핑용)
├── console.glb      # 🎮 게임 콘솔 (PS5, Xbox)
└── bike.glb         # 🚴 자전거 (로드바이크, MTB)
```

각 모델은:
- **폴리곤 수**: 5,000 ~ 20,000
- **텍스처**: 1024x1024
- **포맷**: GLB (Draco 압축)
- **크기**: 1~3MB 이하

---

**준비가 되었다면, GLB 파일을 `public/models/` 폴더에 넣고 개발 서버를 새로고침하세요!** 🚀

