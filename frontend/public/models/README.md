# 3D Models Directory

이 폴더에 Blender에서 내보낸 GLB 파일을 저장하세요.

## 📦 필요한 파일 목록

```
public/models/
├── camera.glb       # 카메라
├── drone.glb        # 드론
├── tent.glb         # 텐트 (캠핑용품)
├── console.glb      # 게임 콘솔
└── bike.glb         # 자전거
```

## 🎨 Blender에서 GLB 내보내기

### 1. Blender에서 내보내기 단계

```
File → Export → glTF 2.0 (.glb/.gltf)
```

### 2. Export 설정 (권장)

#### Format 탭
- **Format**: `glTF Binary (.glb)` ✅
- **Remember Export Settings**: 체크

#### Include 탭
- **Selected Objects**: 체크 (선택한 오브젝트만)
- **Visible Objects**: 체크 (보이는 것만)
- **Active Collection**: 해제
- **Active Scene**: 해제
- **Custom Properties**: 체크
- **Cameras**: 해제
- **Punctual Lights**: 필요시 체크

#### Transform 탭
- **+Y Up**: 체크 ✅ (Three.js 호환)
- **Scale**: 1.0

#### Geometry 탭
- **Apply Modifiers**: 체크 ✅
- **UVs**: 체크
- **Normals**: 체크
- **Tangents**: 체크
- **Vertex Colors**: 필요시 체크
- **Materials**: Export

#### Animation 탭
- **Animation**: 애니메이션 있으면 체크
- **Limit to Playback Range**: 체크
- **Sampling Rate**: 1
- **Always Sample Animations**: 체크

#### Compression (⚠️ 필수!)
- **Compression**: `Draco` ✅ (파일 크기 60% 감소)
  - Quantize Position: 14
  - Quantize Normal: 10
  - Quantize Texcoord: 12
  - Compression level: 6

> 🚨 **중요**: Draco 압축은 필수입니다! 현재 파일 크기(60.8MB)를 20MB 이하로 줄여야 합니다.
> 📖 자세한 가이드: [DRACO_EXPORT_GUIDE.md](./DRACO_EXPORT_GUIDE.md)

### 3. 최적화 팁

#### 폴리곤 수 줄이기
```
Blender → Modifiers → Decimate
- Ratio: 0.5 (폴리곤 50% 감소)
```

#### 텍스처 최적화
- 텍스처 해상도: 1024x1024 또는 2048x2048
- 포맷: PNG 또는 JPG
- 불필요한 텍스처 제거

#### 권장 폴리곤 수
- **단순한 오브젝트**: 500 ~ 2,000 폴리곤
- **중간 복잡도**: 2,000 ~ 10,000 폴리곤
- **상세한 오브젝트**: 10,000 ~ 50,000 폴리곤

## 🚀 Three.js에서 사용법

```jsx
import { useGLTF } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/models/camera.glb');
  return <primitive object={scene} />;
}

// 프리로드 (권장)
useGLTF.preload('/models/camera.glb');
```

## 📏 모델 크기 가이드

Three.js에서 적절한 스케일을 위해 Blender에서 다음 크기로 모델링하세요:

- **1 Blender Unit = 1 Meter** (기본)
- 작은 물건 (카메라, 콘솔): 0.2 ~ 0.5 unit
- 중간 물건 (드론, 텐트): 0.5 ~ 1.5 unit
- 큰 물건 (자전거): 1.5 ~ 2.5 unit

## 🎭 Material 설정 (권장)

Blender에서 PBR Material 사용:
- **Base Color**: 기본 색상
- **Metallic**: 금속성 (0 ~ 1)
- **Roughness**: 거칠기 (0 ~ 1)
- **Normal Map**: 디테일 추가 (선택)
- **Emission**: 발광 효과 (선택)

## 🐛 문제 해결

### 모델이 안 보여요
- Blender에서 Scale 확인 (Apply Transform)
- 카메라 위치 확인
- Normals 방향 확인 (Flip if needed)

### 색상이 이상해요
- Material 설정 확인
- Lighting 추가 필요
- Vertex Color 확인

### 파일이 너무 커요
- Draco Compression 사용
- 텍스처 해상도 낮추기
- 폴리곤 수 줄이기 (Decimate)

## 📚 참고 자료

- [glTF 공식 문서](https://www.khronos.org/gltf/)
- [Blender glTF Export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [@react-three/drei useGLTF](https://github.com/pmndrs/drei#usegltf)

## 🎨 무료 3D 모델 다운로드

테스트용으로 사용할 수 있는 무료 3D 모델 사이트:
- [Sketchfab](https://sketchfab.com/feed) - glTF 다운로드 가능
- [Poly Haven](https://polyhaven.com/models) - CC0 라이선스
- [Kenney Assets](https://kenney.nl/assets) - CC0 라이선스
- [Quaternius](https://quaternius.com/) - CC0 라이선스

